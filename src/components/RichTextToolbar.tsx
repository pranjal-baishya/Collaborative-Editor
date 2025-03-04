import React from "react"
import { RichUtils } from "draft-js"
import styled from "styled-components"

const ToolbarContainer = styled.div`
  display: flex;
  padding: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid #eee;
  flex-wrap: wrap;
`

const ToolButton = styled.button<{ active?: boolean }>`
  margin-right: 8px;
  padding: 6px 10px;
  background: ${(props) => (props.active ? "#e6f7ff" : "white")};
  border: 1px solid #d9d9d9;
  border-radius: 2px;
  cursor: pointer;

  &:hover {
    background: #f5f5f5;
  }
`

interface RichTextToolbarProps {
  editorState: any
  onChange: (editorState: any) => void
}

const RichTextToolbar: React.FC<RichTextToolbarProps> = ({
  editorState,
  onChange,
}) => {
  const inlineStyles = [
    { label: "B", style: "BOLD" },
    { label: "I", style: "ITALIC" },
    { label: "U", style: "UNDERLINE" },
    { label: "S", style: "STRIKETHROUGH" },
    { label: "Code", style: "CODE" },
  ]

  const blockTypes = [
    { label: "H1", style: "header-one" },
    { label: "H2", style: "header-two" },
    { label: "H3", style: "header-three" },
    { label: "Blockquote", style: "blockquote" },
    { label: "UL", style: "unordered-list-item" },
    { label: "OL", style: "ordered-list-item" },
    { label: "Code Block", style: "code-block" },
  ]

  const handleInlineStyle = (
    event: React.MouseEvent<HTMLButtonElement>,
    style: string
  ) => {
    event.preventDefault()
    onChange(RichUtils.toggleInlineStyle(editorState, style))
  }

  const handleBlockType = (
    event: React.MouseEvent<HTMLButtonElement>,
    blockType: string
  ) => {
    event.preventDefault()
    onChange(RichUtils.toggleBlockType(editorState, blockType))
  }

  const currentStyle = editorState.getCurrentInlineStyle()
  const selection = editorState.getSelection()
  const blockType = editorState
    .getCurrentContent()
    .getBlockForKey(selection.getStartKey())
    .getType()

  return (
    <ToolbarContainer>
      {inlineStyles.map((type) => (
        <ToolButton
          key={type.style}
          active={currentStyle.has(type.style)}
          onMouseDown={(e) => handleInlineStyle(e, type.style)}
        >
          {type.label}
        </ToolButton>
      ))}

      {blockTypes.map((type) => (
        <ToolButton
          key={type.style}
          active={blockType === type.style}
          onMouseDown={(e) => handleBlockType(e, type.style)}
        >
          {type.label}
        </ToolButton>
      ))}
    </ToolbarContainer>
  )
}

export default RichTextToolbar
