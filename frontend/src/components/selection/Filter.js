import React from 'react'
import styles from './selection.module.css'
import { filter_icon, cross_icon, trash_icon } from '../../utils/icons'
// import CircularLoader from '../../utils/CircularLoader'

export default function Filter({display,
                                setDisplay,
                                setFilter,
                                setSort,
                                handleTag,
                                labels,
                                start,
                                setStartTime,
                                end,
                                setEndTime,
                                handleSelectAll,
                                checked,
                                deleteSelected,
                                deleting}) {

    return (
        <div className='tour-filter'>
            <span  className={styles.select_container}>
              <button className={styles.filter_button} onClick={() => setDisplay(!display)}>
                {!display ? <img className={!display ? styles.filter_icon : styles.filter_icon_active} alt='filter' src={filter_icon}></img> : <img alt="" src={cross_icon}></img>}</button>
            </span>   
            
            {display ? <div className={styles.filters}>
              <span className={styles.row}>
                <select className={styles.filter} onChange={(e) => setFilter(e.target.value)}>
                  <option>All</option>
                  <option>Incomplete</option>
                  <option>Complete</option>
                  <option>Trained</option>
                  <option>Exported</option>
                </select>

                <select className={styles.filter} onChange={(e) => handleTag(e.target.value)}>
                  {labels.map((label,index) => <option key={index}>{label}</option>)} 
                </select>

                <select className={styles.filter} onChange={(e) => setSort(e.target.value)}>
                  <option>All</option>
                  <option>Confidence</option>
                </select>
              </span>

              <span className={styles.row}>
                <input type="date" id="start" name="Start" value={start} onChange={(e) => setStartTime(e.target.value)}/>
                <label>-</label>
                <input type="date" id="end" name="End" value={end} onChange={(e) => setEndTime(e.target.value)}/> 
              </span>

              {display ? <div className={styles.select_container}>
                <button className={styles.select} onClick={() => handleSelectAll()}>Select All</button>
                {checked.length > 0 ? <div className={styles.delete_container}>
                  {deleting ? 
                  <div className={styles.loader_container}><div className={styles.loader}></div></div> : 
                  <button className={styles.delete_selected} onClick={() => deleteSelected()} checked={false}><img src={trash_icon} alt=''></img></button>}</div> : null}
              </div> : null}    
            
            </div> : null}
        </div>
    )
}