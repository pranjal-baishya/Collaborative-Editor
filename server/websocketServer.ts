import WebSocket from "ws"
import Document from "./models/Document"
import connectDB from "./db"

// Simple in-memory document storage
const documents = new Map()

const wss = new WebSocket.Server({ port: 8080 })

// Initialize database connection
connectDB()

wss.on(
  "connection",
  (ws: WebSocket & { userId?: string; documentId?: string }) => {
    console.log("Client connected")

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString())
        console.log("Received message:", data.type, data.documentId)

        switch (data.type) {
          case "join":
            // Store user info on the WebSocket object
            ws.userId = data.user.id
            ws.documentId = data.documentId
            console.log(
              `User ${data.user.id} joined document ${data.documentId}`
            )

            // Create document if it doesn't exist
            if (!documents.has(data.documentId)) {
              documents.set(data.documentId, {
                id: data.documentId,
                title: "Untitled Document",
                content: null,
                users: [],
              })
              console.log(`Created new document: ${data.documentId}`)
            }

            // Add user to document
            const docToJoin = documents.get(data.documentId)
            if (
              !docToJoin.users.find(
                (u: { id: string }) => u.id === data.user.id
              )
            ) {
              docToJoin.users.push(data.user)
              console.log(
                `Added user ${data.user.id} to document. Users now:`,
                docToJoin.users
              )
            }

            // Send document data to new user
            ws.send(
              JSON.stringify({
                type: "document",
                data: docToJoin,
              })
            )
            console.log(`Sent document data to user ${data.user.id}`)

            // Notify other users
            broadcastToDocument(data.documentId, {
              type: "user-joined",
              users: docToJoin.users,
            })
            console.log(`Broadcast user-joined to document ${data.documentId}`)
            break

          case "update":
            const docToUpdate = documents.get(data.documentId)
            if (docToUpdate) {
              // Update document content
              docToUpdate.content = data.content
              docToUpdate.updatedAt = new Date()

              // Save history
              const historyEntry = {
                content: data.content,
                timestamp: new Date(),
                userId: data.sender,
              }

              // Add to in-memory history
              if (!docToUpdate.history) docToUpdate.history = []
              docToUpdate.history.push(historyEntry)

              // Keep only last 50 versions in memory
              if (docToUpdate.history.length > 50) {
                docToUpdate.history = docToUpdate.history.slice(
                  docToUpdate.history.length - 50
                )
              }

              // Persist to database
              Document.findOneAndUpdate(
                { id: data.documentId },
                {
                  $set: { content: data.content, updatedAt: new Date() },
                  $push: { history: historyEntry },
                },
                { upsert: true }
              ).catch((err) => console.error("Error saving document:", err))

              // Broadcast update to all clients in the document
              broadcastToDocument(data.documentId, {
                type: "update",
                sender: data.sender,
                content: data.content,
              })
            }
            break

          case "title-update":
            // Update document title
            if (documents.has(data.documentId)) {
              const docToUpdateTitle = documents.get(data.documentId)
              docToUpdateTitle.title = data.title

              // Broadcast title update to all users
              broadcastToDocument(data.documentId, {
                type: "title-update",
                title: data.title,
              })
            }
            break

          case "cursor-update":
            // Broadcast cursor position to other users
            broadcastToDocument(
              data.documentId,
              {
                type: "cursor-update",
                sender: data.userId,
                cursor: data.cursor,
              },
              data.userId
            )
            break

          case "leave":
            handleUserLeave(data.userId, data.documentId)
            break

          case "fetch-history":
            // Handle history request
            Document.findOne({ id: data.documentId })
              .then((document) => {
                if (document && ws.readyState === WebSocket.OPEN) {
                  ws.send(
                    JSON.stringify({
                      type: "history",
                      history: document.history,
                    })
                  )
                }
              })
              .catch((err) => console.error("Error fetching history:", err))
            break

          case "restore-version":
            // Restore a specific version
            Document.findOne({ id: data.documentId })
              .then((document) => {
                if (
                  document &&
                  document.history &&
                  document.history.length > data.versionIndex
                ) {
                  const version = document.history[data.versionIndex]

                  // Update current document content
                  document.content = version.content

                  // Add restoration as a new history entry
                  document.history.push({
                    content: version.content,
                    timestamp: new Date(),
                    userId: data.userId,
                    restoredFrom: data.versionIndex,
                  })

                  return document.save()
                }
              })
              .then((document) => {
                if (document) {
                  // Broadcast the restored version
                  broadcastToDocument(data.documentId, {
                    type: "update",
                    sender: data.userId,
                    content: document.content,
                  })
                }
              })
              .catch((err) => console.error("Error restoring version:", err))
            break
        }
      } catch (error) {
        console.error("Error processing message:", error)
      }
    })

    ws.on("close", () => {
      console.log("Client disconnected")
      if (ws.userId && ws.documentId) {
        handleUserLeave(ws.userId, ws.documentId)
      }
    })

    function handleUserLeave(userId: string, documentId: string) {
      if (documents.has(documentId)) {
        const docToLeave = documents.get(documentId)
        docToLeave.users = docToLeave.users.filter(
          (u: { id: string }) => u.id !== userId
        )

        // Notify other users
        broadcastToDocument(documentId, {
          type: "user-left",
          users: docToLeave.users,
        })

        // Remove empty documents
        if (docToLeave.users.length === 0) {
          documents.delete(documentId)
        }
      }
    }
  }
)
// Broadcast a message to all clients connected to a document
function broadcastToDocument(
  documentId: string,
  message: any,
  excludeUserId?: string | null
) {
  wss.clients.forEach((client: any) => {
    if (
      client.readyState === WebSocket.OPEN &&
      (!excludeUserId || client.userId !== excludeUserId) &&
      client.documentId === documentId
    ) {
      client.send(JSON.stringify(message))
    }
  })
}

console.log("WebSocket server started on port 8080")
