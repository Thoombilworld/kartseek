/// KARTSEEK — Offline Fallback Page (PWA)
/// Shown when the user is offline and the page is not cached.

'use client';

import React from 'react';
import styles from './page.module.css';

export default function OfflinePage() {
  return (
    <div className={styles.container}>
      <div className={styles.iconWrap}>
        📡
      </div>

      <h1 className={styles.heading}>
        You Are Offline
      </h1>

      <p className={styles.message}>
        It looks like you have lost your internet connection. Please check your
        Wi-Fi or mobile data and try again.
      </p>

      <button
        onClick={() => typeof window !== 'undefined' && window.location.reload()}
        className={styles.retryButton}
        title="Retry connection"
      >
        ↻ Try Again
      </button>
    </div>
  );
}
