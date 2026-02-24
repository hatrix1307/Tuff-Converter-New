/* Dual Upload Section */
.upload-section-dual {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    margin-bottom: 2rem;
}

@media (max-width: 968px) {
    .upload-section-dual {
        grid-template-columns: 1fr;
    }
}

.upload-card {
    position: relative;
}

.upload-number {
    position: absolute;
    top: 1rem;
    right: 1rem;
    width: 48px;
    height: 48px;
    background: var(--primary);
    border: 3px solid var(--primary-dark);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-pixel);
    font-size: 1.2rem;
    color: var(--bg-darker);
    box-shadow: 0 4px 16px rgba(45, 212, 191, 0.4);
    animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
    0%, 100% {
        transform: scale(1);
        box-shadow: 0 4px 16px rgba(45, 212, 191, 0.4);
    }
    50% {
        transform: scale(1.05);
        box-shadow: 0 6px 24px rgba(45, 212, 191, 0.6);
    }
}

.upload-card.has-file .upload-number {
    background: var(--success);
    border-color: #059669;
    animation: none;
}

.upload-card.has-file .upload-number::after {
    content: '✓';
    position: absolute;
}

.options-card {
    background: var(--bg-card);
    border: 2px solid var(--border);
    padding: 2rem;
    box-shadow: 0 8px 32px var(--shadow);
    margin-bottom: 2rem;
}
