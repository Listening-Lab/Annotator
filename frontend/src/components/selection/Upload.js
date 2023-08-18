import React, {useState, useEffect} from 'react'
import styles from './upload.module.css'
import { trash_icon, cross_icon } from '../../utils/icons'

export default function Upload({token, getAudio, upload, setUpload, state, setState}) {
  const [uploadingAudio, setUploadingAudio] = useState(true)
  const [segment, setSegment] = useState(true)
  const [predict, setPredict] = useState(false) 
  const [refs, setRefs] = useState(null)
  const [references, setReferences] = useState(null)
  const [loading, setLoading] = useState(false)
  const [downsample, setDownsample] = useState(true)
  const [denoise, setDenoise] = useState(false)
  const [files, setFiles] = useState(null)
  const [prefix, setPrefix] = useState('')
  const [refPrefix, setRefPrefix] = useState('')

  const [length, setLength] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    getRefs()
  },[])

  useEffect(() => {
    if (refs !== null) {
      if (refs.length === 0 && uploadingAudio === true) {
        setUploadingAudio(false)
      }
    }
  },[refs])

  useEffect(() => {
    if (refs !== null) {
      if (refs.length === 0) {
        setUploadingAudio(false)
      }
    }
  }, [uploadingAudio])

  useEffect(() => {
    if (refs !== null) {
      if (refs.length === 0) {
        setUploadingAudio(false)
        setUpload(true)
      }
    }
  },[upload],[])

  const handleUpload = async (e) => {
    e.preventDefault()
    setProgress(0)
    if (files !== null){
      const len = files.length
      setLength(len)
      setLoading(true)

      for (let i = 0; i<len; i++) {
        const form = new FormData()
        form.append('files', files[i], prefix.concat(files[i].name))
        const requestOptions = {
              method: "POST",
              headers: {Authorization: "Bearer " + token},
              body: form
          }
        const response = await fetch(`http://localhost:8000/api/upload-audio?downsample=${downsample}&denoise=${denoise}&segment=${segment}&predict=${predict}`, requestOptions)
        if (response.ok) {
          setProgress(progress => progress + 1)
        }
      }
      setState(!state)
      setLoading(false)
      getAudio()
      
    }
  }

  const handleFiles = (e) => {
    setFiles(e.target.files)
  }

  const handlePrefix = (e) => {
    setPrefix(e.target.value)
  }

  const handleRefPrefix = (e) => {
    setRefPrefix(e.target.value)
  }

  const handleReferences = (e) => {
    setReferences(e.target.files)
  }
  
  const handleReferenceUpload = async (e) => {
    e.preventDefault()
    setProgress(0)
    if (references !== null){
      const len = references.length
      setLength(len)
      setLoading(true)

      for (let i = 0; i<len; i++) {
        const form = new FormData()
        form.append('files', references[i], refPrefix.concat(references[i].name))
        const requestOptions = {
              method: "POST",
              headers: {Authorization: "Bearer " + token},
              body: form
          }
        const response = await fetch(`http://localhost:8000/api/upload-refs`, requestOptions)
        if (response.ok) {
          setProgress(progress => progress + 1)
        }
      }
      setLoading(false)
      getRefs()
      
    }
  }

  const getRefs = async () => {
    const requestOptions = {
      method: "GET",
      headers: {Authorization: "Bearer " + token}
    }
    const response = await fetch(`http://localhost:8000/api/get-refs/`, requestOptions)
    
    if (response.ok){
      const data = await response.json()
      setRefs(() => [])
      for (const file of data){
        setRefs(refs => [...refs, file])
      }
    }
  }

  const deleteRefs = async (file) => {
    const requestOptions = {
      method: "DELETE",
      headers: {Authorization: "Bearer " + token}
    }
    await fetch(`http://localhost:8000/api/delete-refs/${file}`, requestOptions)
    getRefs()
  }

  return (
    <div className={styles.background}>
      { upload ? 
        <div className="tour-upload" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', width: '90%', position: 'relative', bottom: 20}}>
          <div className={styles.container}>
            <span className={styles.options}>
                <div className={styles.option} tabIndex={1} style={{backgroundColor: uploadingAudio ? 'var(--foreground-colour)': null}} onClick={() => setUploadingAudio(true)}>{uploadingAudio ? "Upload Audio" : "Audio"}</div>
                <div className={styles.option} tabIndex={2} style={{backgroundColor: !uploadingAudio ? 'var(--foreground-colour)': null}} onClick={() => setUploadingAudio(false)}>{uploadingAudio ? "Reference" : "Upload Reference"}</div>
            </span>

            {uploadingAudio ? 
              <form className={styles.upload} onSubmit={(e) => handleUpload(e)}>
                <span className={styles.column}>
                  <div className={styles.inputBar}>
                    <div className={styles.inputColumn}>
                      <div className={styles.inputRow}>
                        <input className={styles.inputPrefix} type='text' onChange={handlePrefix} placeholder='prefix'></input>
                        <input className={styles.inputFiles} type='file' onChange={handleFiles} multiple required />
                        <button className={styles.upload_button} type='submit'>+</button>
                      </div>
                      {loading ? 
                      <div className={styles.bar}>
                          <div className={styles.progressBar} style={{width: `${100* progress/length}%`}}></div>
                      </div> : <hr style={{backgroundColor:"rgb(200, 200, 200)"}}></hr>}
                      <div className={styles.checkboxes}>
                        <div>
                          <div className={styles.checkbox}><input className={styles.box} type='checkbox' onChange={() => setDownsample(!downsample)} checked={downsample}/><label>Downsample</label></div>
                          <div className={styles.checkbox}><input className={styles.box} type='checkbox' onChange={() => setDenoise(!denoise)} checked={denoise}/><label>Denoise</label></div>
                        </div>
                        <div>
                          <div className={styles.checkbox}><input className={styles.box} type='checkbox' onChange={() => setSegment(!segment)} checked={segment}/><label>Segment</label></div>
                          <div className={styles.checkbox}><input className={styles.box} type='checkbox' onChange={() => setPredict(!predict)} checked={predict}/><label>Predict</label></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </span>
              </form> 

            : <form className={styles.upload} onSubmit={(e) => handleReferenceUpload(e)}>
                <span className={styles.column}>
                  <div className={styles.inputBar}>
                    <div className={styles.inputColumn}>

                      <div className={styles.inputRow}>
                        <input className={styles.inputPrefix} type='none' onChange={handleRefPrefix} placeholder='prefix'></input>
                        <input className={styles.inputFiles} type='file' onChange={handleReferences} multiple required />
                        <button className={styles.upload_button} type='submit'>+</button>
                      </div>
                      {loading ? 
                        <div className={styles.bar}>
                            <div className={styles.progressBar} style={{width: `${100* progress/length}%`}}></div>
                        </div> : <hr style={{backgroundColor:"rgb(200, 200, 200)"}}></hr>}
                        <div className={styles.list_container}>
                            {refs.length > 0 ? <div >
                              {refs.sort().map((ref) => <div tabIndex="1" className={styles.refs} key={ref}>
                                <div className={styles.ref_items}>
                                    <p className={styles.name}>{ref}</p>
                                    <button type="button" className={styles.delete_ref} data-value={ref} onClick={(e) => deleteRefs(e.target.getAttribute('data-value'))}><img src={trash_icon} alt="delete" data-value={ref}></img></button>
                                </div>
                              </div>)}
                            </div> : <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}> 
                              <h3 className={styles.alternate}>{"Reference(s) required to generate segments"}</h3>
                              <button className={styles.selection_button}>Default References</button>
                            </div>}
                        </div>
                    </div>
                  </div>
                </span>
              </form> }
            </div>
          <div style={{margin: '20px', alignSelf: 'center', display: 'flex'}} onClick={() => setUpload(!upload)}>{!upload ? "Upload Audio" : <div><img className={styles.cross} alt="" src={cross_icon}></img></div>}</div>
        </div>
      : null}
      <div style={{margin: '20px', alignSelf: 'center', display: 'flex'}} onClick={() => setUpload(!upload)}>{!upload ? "Upload Audio" : null}</div>
    </div>
  )
}