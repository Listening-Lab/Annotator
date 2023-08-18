import React, {useState} from 'react'
import styles from './selection.module.css'
import {trash_icon } from '../../utils/icons'

import Confidence from './Confidence'

export default function Playlist({display, 
                                  playlist,
                                  filterByDate, 
                                  filterByStatus,
                                  sortPlaylist,
                                  setAudioID,
                                  audio_id,
                                  setAudio,
                                  audio_file,
                                  setChecked,
                                  checked,
                                  updateAudio,
                                  deleteItem,
                                  reload,
                                  setReload,
                                  gridFalse,
                                  state,
                                  maxConfidence}) {

  const [limit, setLimit] = useState(10)

  const handleAudioClick = (e, audio) => {
    if (e.target.tagName !== 'INPUT') {
      setAudio(audio.filename);
      setAudioID(audio_id === audio.id ? null : audio.id)
      setReload(!reload)
      
    }
  }

  const handleCheck = (e, audio) => {
    e.stopPropagation()
    var updatedList = [...checked]
    if (e.target.checked) {
      updatedList = [...checked, e.target.value]
    } else {
      if (checked.indexOf(e.target.value) !== -1) {
        updatedList.splice(checked.indexOf(e.target.value), 1)
      }
    }
    setChecked(updatedList)
  }

    return (
        <div className='tour-playlist' style={{width:'100%', maxHeight:'700px'}}>
          <hr style={{margin:'25px'}}></hr>
            <div className={styles.list_container} style={{maxHeight: display ? "560px" : "730px"}}>
              {playlist.length > 0 ? <div className={styles.list}>
                {playlist.filter((audio) => filterByDate(audio)).filter((audio) => filterByStatus(audio)).sort(sortPlaylist).map((audio, index) =>  (index < limit) ? <div tabIndex="1" key={audio.id} onClick={(e) => handleAudioClick(e, audio)} className={styles.audio}  
                  
                  style={{
                    height: audio.id === audio_id ? '150px' : '60px',
                    borderColor: audio.status === 'Complete' ? 'rgb(45, 145, 45)' : audio.status === 'Trained' ? 'rgb(150, 150, 150)' : 'rgb(180, 45, 45)',
                    background: audio.status === 'Trained' ? 'rgb(50, 50, 50, 0.1)' : (audio.status === 'Exported' ? 'rgb(80, 80, 80, 0.1)' : null),
                    transform: audio.filename === audio_file ? 'scale(1.05,1)' : 'scale(1.0)',
                    transition: 'height 0.2s ease-in-out',
                    zIndex: audio.filename === audio_file ? 4 : 0,
                  }}>
                    
                  <input className={styles.checkboxes} value={audio.id} type="checkbox" onChange={(e) => handleCheck(e, audio.filename)} checked={(checked.includes(audio.id.toString())) ? 'checked' : null}/>
                  <div className={styles.column}>
                      <Confidence audio={audio}
                                  audio_id={audio_id} 
                                  reload={reload}
                                  gridFalse={gridFalse}
                                  updateAudio={updateAudio}
                                  state={state}
                                  maxConfidence={maxConfidence}/>
                      <div className={styles.dropdown} style={{display: audio.id === audio_id ? 'block' : 'none'}}>
                      <hr className={styles.hr}></hr>                
                      <span className={styles.row}>
                        <div className={styles.column}>
                          <p className={styles.status}>Audio Status: {audio.status}</p>
                          <p className={styles.status}>Segment Confidence: {audio.confidence.toFixed(3)}</p>
                        </div>
                        
                        <button className={styles.delete} onClick={() => deleteItem(index)}><img src={trash_icon} alt='delete'></img></button>
                      </span>
                    </div>
                  </div>
                  
                </div> : null)}
                <button onClick={() => setLimit(limit+20)}>+</button>
              </div> : <h3 className={styles.alternate}>Upload Audio to begin</h3>}
            </div>
            <hr style={{margin:'25px'}}></hr>
          </div>
    )
}