import React from 'react'
import styles from './timestamp.module.css'

export default function Timestamps({time, duration}) {
    return (
        <span className={styles.timestamps}>
            <label>{time} / {duration}</label>
        </span>
    )
}