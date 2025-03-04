import React, { useState, useEffect, useRef } from "react"
import { Editor, EditorState, convertToRaw, convertFromRaw } from "draft-js"
import "draft-js/dist/Draft.css"
import styled from "styled-components"
import RichTextToolbar from "./RichTextToolbar"

// Types
interface User {
  id: string
  name: string
  color: string
  cursor?: {
    blockKey: string
    offset: number
  }
  selection?: {
    anchorKey: string
    anchorOffset: number
    focusKey: string
    focusOffset: number
  }
}

interface DocumentData {
  id: string
  title: string
  content: any // Draft.js content
  users: User[]
}

// Styled Components
const EditorContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
`

const DocumentHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #eaeaea;
`

const DocumentTitle = styled.input`
  font-size: 24px;
  font-weight: 600;
  border: none;
  outline: none;
  background: transparent;
  padding: 5px;
  border-radius: 4px;

  &:hover,
  &:focus {
    background: #f5f5f5;
  }
`

const UserPresence = styled.div`
  display: flex;
  gap: 8px;
`

const UserAvatar = styled.div<{ color: string }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: ${(props) => props.color};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
`

const EditorWrapper = styled.div`
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  overflow-y: auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  background: white;
`

const CollaborativeEditor: React.FC = () => {
  // Get document ID from URL or use a default
  const documentId =
    new URLSearchParams(window.location.search).get("docId") ||
    "shared-document-1"

  // Generate random user ID and color if not in localStorage
  const [currentUser] = useState(() => {
    const savedUser = localStorage.getItem("collaborativeUser")
    if (savedUser) return JSON.parse(savedUser)

    const newUser = {
      id: Math.random().toString(36).substring(2, 10),
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
      name: `User-${Math.floor(Math.random() * 1000)}`,
    }

    localStorage.setItem("collaborativeUser", JSON.stringify(newUser))
    return newUser
  })

  // State for the document
  const [editorState, setEditorState] = useState(() =>
    EditorState.createEmpty()
  )
  const [documentData, setDocumentData] = useState<DocumentData>({
    id: "doc-1",
    title: "Untitled Document",
    content: null,
    users: [],
  })

  // WebSocket reference
  const wsRef = useRef<WebSocket | null>(null)

  // Initialize WebSocket connection
  useEffect(() => {
    console.log(
      `Connecting to WebSocket with user ${currentUser.id} for document ${documentId}`
    )
    wsRef.current = new WebSocket("ws://localhost:8080")

    wsRef.current.onopen = () => {
      console.log("Connected to WebSocket server")

      // Add a small delay to ensure connection is fully established
      setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          console.log("Sending join message")
          try {
            wsRef.current.send(
              JSON.stringify({
                type: "join",
                documentId: documentId,
                user: currentUser,
              })
            )
            console.log(`Sent join message for document ${documentId}`)
          } catch (error) {
            console.error("Error sending join message:", error)
          }
        } else {
          console.error("WebSocket not ready:", wsRef.current?.readyState)
        }
      }, 100)
    }

    wsRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data)

      switch (message.type) {
        case "document":
          // Received initial document data
          setDocumentData(message.data)
          if (message.data.content) {
            const contentState = convertFromRaw(message.data.content)
            setEditorState(EditorState.createWithContent(contentState))
          }
          break

        case "update":
          // Received document update
          if (message.sender !== currentUser.id) {
            const contentState = convertFromRaw(message.content)
            setEditorState(EditorState.createWithContent(contentState))
          }
          break

        case "user-joined":
        case "user-left":
          // Update user list
          setDocumentData((prev) => ({
            ...prev,
            users: message.users,
          }))
          break

        case "cursor-update":
          // Update user cursor position
          if (message.sender !== currentUser.id) {
            setDocumentData((prev) => ({
              ...prev,
              users: prev.users.map((user) =>
                user.id === message.sender
                  ? { ...user, cursor: message.cursor }
                  : user
              ),
            }))
          }
          break
      }
    }

    wsRef.current.onclose = () => {
      console.log("Disconnected from WebSocket server")
    }

    return () => {
      // Leave document and close connection on unmount
      if (wsRef.current) {
        try {
          if (wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: "leave",
                documentId: documentId,
                userId: currentUser.id,
              })
            )
          }
        } catch (e) {
          console.error("Error sending leave message:", e)
        } finally {
          wsRef.current.close()
        }
      }
    }
  }, [documentId, currentUser])

  // Add cursor tracking
  const handleCursorChange = (editorState: EditorState) => {
    const selection = editorState.getSelection()
    if (!selection.getHasFocus()) return

    const blockKey = selection.getAnchorKey()
    const offset = selection.getAnchorOffset()

    // Only send updates when cursor actually moved
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "cursor-update",
          documentId: documentId,
          sender: currentUser.id,
          cursor: { blockKey, offset },
          selection: selection.isCollapsed()
            ? null
            : {
                anchorKey: selection.getAnchorKey(),
                anchorOffset: selection.getAnchorOffset(),
                focusKey: selection.getFocusKey(),
                focusOffset: selection.getFocusOffset(),
              },
        })
      )
    }
  }

  // Enhanced onChange function
  const onChange = (newEditorState: EditorState) => {
    const contentChanged =
      newEditorState.getCurrentContent() !== editorState.getCurrentContent()
    const selectionChanged =
      newEditorState.getSelection() !== editorState.getSelection()

    setEditorState(newEditorState)

    // Send content updates only when content actually changes
    if (contentChanged) {
      const contentState = newEditorState.getCurrentContent()
      const rawContent = convertToRaw(contentState)

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "update",
            documentId: documentId,
            sender: currentUser.id,
            content: rawContent,
          })
        )
      }
    }

    // Track cursor/selection separately
    if (selectionChanged) {
      handleCursorChange(newEditorState)
    }
  }

  // Handle document title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setDocumentData((prev) => ({ ...prev, title: newTitle }))

    // Send title update to server if WebSocket is connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "title-update",
          documentId: documentData.id,
          title: newTitle,
        })
      )
    }
  }

  // Add custom editor component to render other users' cursors and selections
  const UserCursors = ({
    users,
    editorState,
  }: {
    users: any[]
    editorState: EditorState
  }) => {
    return (
      <div className="user-cursors">
        {users
          .filter(
            (user: { id: string; cursor: boolean }) =>
              user.id !== currentUser.id && user.cursor
          )
          .map((user) => (
            <div
              key={user.id}
              style={{
                position: "absolute",
                left: getCursorPosition(user.cursor, editorState).left,
                top: getCursorPosition(user.cursor, editorState).top,
                height: "20px",
                width: "2px",
                backgroundColor: user.color,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "-18px",
                  backgroundColor: user.color,
                  color: "white",
                  padding: "2px 4px",
                  borderRadius: "2px",
                  fontSize: "12px",
                }}
              >
                {user.name}
              </div>
            </div>
          ))}
      </div>
    )
  }

  // Add this function before using it
  const getCursorPosition = (cursor: any, editorState: EditorState) => {
    // Default position if we can't calculate it
    const defaultPosition = { left: 0, top: 0 }

    if (!cursor || !cursor.blockKey) return defaultPosition

    // Try to find the DOM node for the block
    const blockElement = document.querySelector(
      `[data-offset-key="${cursor.blockKey}-0-0"]`
    )
    if (!blockElement) return defaultPosition

    // Get block position
    const blockRect = blockElement.getBoundingClientRect()

    // Estimate character width (adjust as needed)
    const charWidth = 8

    return {
      left: blockRect.left + cursor.offset * charWidth,
      top: blockRect.top,
    }
  }

  return (
    <EditorContainer>
      <DocumentHeader>
        <DocumentTitle
          value={documentData.title}
          onChange={handleTitleChange}
          placeholder="Untitled Document"
        />
        <UserPresence>
          {documentData.users.map((user) => (
            <UserAvatar key={user.id} color={user.color} title={user.name}>
              {user.name.charAt(0).toUpperCase()}
            </UserAvatar>
          ))}
        </UserPresence>
      </DocumentHeader>

      <EditorWrapper>
        <Editor
          editorState={editorState}
          onChange={onChange}
          placeholder="Start typing here..."
        />
        <RichTextToolbar editorState={editorState} onChange={onChange} />
      </EditorWrapper>
      <UserCursors users={documentData.users} editorState={editorState} />
    </EditorContainer>
  )
}

export default CollaborativeEditor
