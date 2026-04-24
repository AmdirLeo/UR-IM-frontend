import { useState, useEffect, useCallback } from 'react';

export const useContextMenu = () => {
  const [xPos, setXPos] = useState("0px");
  const [yPos, setYPos] = useState("0px");
  const [showMenu, setShowMenu] = useState(false);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      // Dispatch a custom event to close other context menus
      window.dispatchEvent(new Event('close-context-menus'));
      e.stopPropagation();

      setXPos(`${e.pageX}px`);
      setYPos(`${e.pageY}px`);
      setShowMenu(true);
    },
    [setXPos, setYPos]
  );

  const handleClick = useCallback(() => {
    showMenu && setShowMenu(false);
  }, [showMenu]);

  useEffect(() => {
    document.addEventListener("click", handleClick);
    document.addEventListener("contextmenu", handleClick);
    window.addEventListener("close-context-menus", handleClick);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("contextmenu", handleClick);
      window.removeEventListener("close-context-menus", handleClick);
    };
  }, [handleClick]);

  return { xPos, yPos, showMenu, setShowMenu, handleContextMenu };
};
