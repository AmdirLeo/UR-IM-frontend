import React, { useEffect, useRef } from 'react';

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  danger?: boolean;
}

interface ContextMenuProps {
  x: string;
  y: string;
  show: boolean;
  onClose: () => void;
  items: ContextMenuItem[];
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, show, onClose, items }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show) return;

    const handleWindowResize = () => onClose();
    const handleScroll = () => onClose();

    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('scroll', handleScroll, true); // true to catch scrolling on any element

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [show, onClose]);

  const [style, setStyle] = React.useState({ top: y, left: x, visibility: 'hidden' as 'hidden' | 'visible' });

  useEffect(() => {
    if (!show) {
      setStyle({ top: y, left: x, visibility: 'hidden' });
      return;
    }

    // Delay bounding check until after the initial render so menuRef is populated
    requestAnimationFrame(() => {
      let top = y;
      let left = x;

      if (menuRef.current) {
        const rect = menuRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        const numX = parseInt(x, 10);
        const numY = parseInt(y, 10);

        if (numX + rect.width > viewportWidth) {
          left = `${Math.max(0, numX - rect.width)}px`;
        }

        if (numY + rect.height > viewportHeight) {
          top = `${Math.max(0, numY - rect.height)}px`;
        }
      }

      setStyle({ top, left, visibility: 'visible' });
    });
  }, [show, x, y]);

  if (!show) return null;

  return (
    <div
      ref={menuRef}
      style={style}
      className="fixed z-50 min-w-[160px] bg-panel border border-primary rounded-md shadow-lg py-1 animate-in fade-in zoom-in duration-150"
      onClick={(e) => e.stopPropagation()} // Prevent click from closing immediately if we want to handle it
      onContextMenu={(e) => {
         e.preventDefault();
         e.stopPropagation();
      }}
    >
      {items.map((item, index) => (
        <button
          key={index}
          className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 transition-colors ${
            item.danger
              ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
              : 'text-primary hover:bg-hover'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            item.onClick();
            onClose();
          }}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
};
