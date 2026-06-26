import { useState, useRef, useEffect } from "react";
import { PanelLeftOpen, PanelLeftClose } from "lucide-react";

export interface BranchListToggleButtonProps {
  open: boolean;
  onClick: () => void;
  editorContainer: HTMLDivElement | null;
}

export function BranchListToggleButton({
  open,
  onClick,
  editorContainer,
}: BranchListToggleButtonProps) {
  // Initial position: left edge, middle-upper height (e.g., top: 120px, left: 8px)
  const [position, setPosition] = useState({ x: 8, y: 120 });
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    startX: number;
    startY: number;
  } | null>(null);
  const totalDragDistanceRef = useRef(0);
  const ignoreNextClickRef = useRef(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!editorContainer || !buttonRef.current) return;
    const button = buttonRef.current;
    button.setPointerCapture(event.pointerId);

    dragStartRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      startX: position.x,
      startY: position.y,
    };
    totalDragDistanceRef.current = 0;
    ignoreNextClickRef.current = false;
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragStartRef.current || !editorContainer || !buttonRef.current) return;
    const start = dragStartRef.current;

    const deltaX = event.clientX - start.clientX;
    const deltaY = event.clientY - start.clientY;

    totalDragDistanceRef.current = Math.max(
      totalDragDistanceRef.current,
      Math.sqrt(deltaX * deltaX + deltaY * deltaY),
    );

    const containerRect = editorContainer.getBoundingClientRect();
    const buttonRect = buttonRef.current.getBoundingClientRect();

    let newX = start.startX + deltaX;
    let newY = start.startY + deltaY;

    // Clamp inside container
    const minX = 8;
    const maxX = containerRect.width - buttonRect.width - 8;
    const minY = 8;
    const maxY = containerRect.height - buttonRect.height - 8;

    newX = Math.min(maxX, Math.max(minX, newX));
    newY = Math.min(maxY, Math.max(minY, newY));

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragStartRef.current || !editorContainer || !buttonRef.current) return;
    const button = buttonRef.current;
    button.releasePointerCapture(event.pointerId);
    dragStartRef.current = null;

    const containerRect = editorContainer.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();

    // Determine nearest edge (left or right)
    const centerX = position.x + buttonRect.width / 2;
    const containerCenterX = containerRect.width / 2;

    const minX = 8;
    const maxX = containerRect.width - buttonRect.width - 8;
    const minY = 8;
    const maxY = containerRect.height - buttonRect.height - 8;

    const finalX = centerX < containerCenterX ? minX : maxX;
    const finalY = Math.min(maxY, Math.max(minY, position.y));

    setPosition({ x: finalX, y: finalY });

    if (totalDragDistanceRef.current >= 4) {
      ignoreNextClickRef.current = true;
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (ignoreNextClickRef.current) {
      ignoreNextClickRef.current = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick();
  };

  // Adjust position if container shrinks and button overflows
  useEffect(() => {
    if (!editorContainer || !buttonRef.current) return;

    const handleResize = () => {
      if (!editorContainer || !buttonRef.current) return;
      const containerRect = editorContainer.getBoundingClientRect();
      const buttonRect = buttonRef.current.getBoundingClientRect();

      const maxX = containerRect.width - buttonRect.width - 8;
      const maxY = containerRect.height - buttonRect.height - 8;

      setPosition((prev) => {
        // Keep it snapped to the edge
        const buttonCenterX = prev.x + buttonRect.width / 2;
        const finalX = buttonCenterX < containerRect.width / 2 ? 8 : Math.max(8, maxX);
        const finalY = Math.min(Math.max(8, prev.y), Math.max(8, maxY));
        return { x: finalX, y: finalY };
      });
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(editorContainer);
    return () => {
      resizeObserver.disconnect();
    };
  }, [editorContainer]);

  const Icon = open ? PanelLeftClose : PanelLeftOpen;
  const label = open ? "Exit list layout" : "Enter list layout";

  return (
    <button
      ref={buttonRef}
      type="button"
      className="mmn-branch-toggle-btn"
      title={label}
      aria-label={label}
      aria-pressed={open}
      style={{
        position: "absolute",
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 13,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
    >
      <Icon size={16} />
    </button>
  );
}
