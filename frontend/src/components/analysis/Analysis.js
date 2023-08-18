import React from 'react'

import styles from './analysis.module.css'
import Visualiser from './Visualiser'


export default function AudioAnalysis({start, end, colours, settings, training}) {
  
    return (
      <div className={styles.backdrop} style={(settings || training) ? {right: "310px"}: {right: "-2vw"}}>

        <Visualiser colours={colours}/>

        {/* <div className={styles.container}>
          {start === end ? null :
          <span className={styles.timestamps}>
            <label>Start: {Math.round(start*100)/100}</label>
            <label>End: {Math.round(end*100)/100}</label>
          </span>}
          
        </div> */}

      </div>);
}