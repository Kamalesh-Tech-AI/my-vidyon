import React from 'react';
import './CSSGridLayout.css';

interface CSSGridLayoutProps {
    header?: React.ReactNode;
    banner?: React.ReactNode;
    leftSidebar?: React.ReactNode;
    mainContent?: React.ReactNode;
    rightSidebar?: React.ReactNode;
    lowerContent?: React.ReactNode;
    footer?: React.ReactNode;
}

export const CSSGridLayout: React.FC<CSSGridLayoutProps> = ({
    header = "Header (Full Width)",
    banner = "Banner (Centered)",
    leftSidebar = "Left Sidebar (Fixed)",
    mainContent = "Main Content (Central Area)",
    rightSidebar = "Right Sidebar (Fixed)",
    lowerContent = "Lower Content (Below Main)",
    footer = "Footer (Full Width)",
}) => {
    return (
        <div className="grid-layout-container">
            <header className="grid-item grid-header">
                {header}
            </header>

            <aside className="grid-item grid-left-sidebar">
                {leftSidebar}
            </aside>

            <section className="grid-item grid-banner">
                {banner}
            </section>

            <main className="grid-item grid-main-content">
                {mainContent}
            </main>

            <aside className="grid-item grid-right-sidebar">
                {rightSidebar}
            </aside>

            <section className="grid-item grid-lower-content">
                {lowerContent}
            </section>

            <footer className="grid-item grid-footer">
                {footer}
            </footer>
        </div>
    );
};
