import React, {useState, useContext, useEffect} from 'react'
import { UserContext } from "../../context/UserContext"

import styles from './selection.module.css'
import Playlist from './Playlist'
import Upload from './Upload'
import Filter from './Filter'


export default function AudioSelection({audio_file, setAudio, audio_id, setAudioID, update, reload, setReload, gridFalse, state, setState, playlist, setPlaylist}) {
  const date = new Date()
  const [token,] = useContext(UserContext)
  const [filter, setFilter] = useState('All')
  const [sort, setSort] = useState('default')
  const [start, setStartTime] = useState('2020-01-01')
  const [end, setEndTime] = useState(`${date.getFullYear()}-${date.getMonth()+1 < 10 ? `0${date.getMonth()+1}`:`${date.getMonth()+1}`}-${date.getDate() < 10 ? `0${date.getDate()}`:`${date.getDate()}`}`)
  const [display, setDisplay] = useState(false)
  const [upload, setUpload] = useState(true)
  const [labels, setLabels] = useState([])  // User labels
  const [tag, setTag] = useState('All')
  const [checked, setChecked] = useState([])
  const [all, setAll] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [maxConfidence, setMaxConfidence] = useState(0)


  useEffect(() => {
    // getUser()
    getMax()
    getAudio()
    getUserLabels()
    setEndTime(`${date.getFullYear()}-${date.getMonth()+1 < 10 ? `0${date.getMonth()+1}`:`${date.getMonth()+1}`}-${date.getDate() < 10 ? `0${date.getDate()}`:`${date.getDate()}`}`)
    
  },[update])

  useEffect(() => {
    getMax()
  },[gridFalse])

  // Get audio when tag is changed
  useEffect(() => {
    getAudio()
  },[tag])

  // This wasnt doing anything not sure if its needed
  // const getUser = async () => {
  //   const requestOptions = {
  //     method: "GET",
  //     headers: {
  //       "Content-Type": "application/json",
  //       Authorization: "Bearer " + token,
  //     },
  //   }
  //   const response = await fetch("http://localhost:8000/api/users/current", requestOptions)
  //   if (response.ok) {
  //     const user = await response.json()
  //   }
  // }

  const updateAudio = async (audio, val, avg, completion) => {
    const requestOptions = {
      method: "PUT",
      headers: {Authorization: "Bearer " + token,
                'Content-Type': 'application/json'},
      body: JSON.stringify({"filename": audio.filename,
                          "status": completion === 1 ? 'Complete' : 'Incomplete',
                          "validation": val,
                          "confidence": avg,
                          "completion": completion})
    }
    await fetch(`http://localhost:8000/api/update-audio/${audio.filename}`, requestOptions)
    getAudio()
  }

  const deleteItem = async (index) => {
    const filename = playlist.filter((audio) => filter === 'All' || audio.status === filter)[index].filename

    const requestOptions = {
      method: "DELETE",
      headers: {Authorization: "Bearer " + token}
    }
    await fetch(`http://localhost:8000/api/delete-audio/${filename}`, requestOptions)
    setPlaylist(playlist.filter(function(value, i, arr){
      return i !== index
    }))
    getAudio()
  }

  const getAudio = async () => {
    // Check audio status
    const statusOptions = {
      method: "GET",
      headers: {Authorization: "Bearer " + token}
    }
    await fetch(`http://localhost:8000/api/audio-status`, statusOptions)

    const requestOptions = {
      method: "GET",
      headers: {Authorization: "Bearer " + token}
    }
    const response = await fetch(`http://localhost:8000/api/get-audio-files/${tag}`, requestOptions)
    
    if (response.ok){
      const data = await response.json()
      setPlaylist(() => [])
      for (const file of data){
        setPlaylist(playlist => [...playlist, file])
      }
      if (data.length !== 0) {
        setUpload(false)
      }
    }
  }

  const getMax = async () => {
    const requestOptions = {
      method: "GET",
      headers: {Authorization: "Bearer " + token}
    }

    const response = await fetch(`http://localhost:8000/api/confidence`, requestOptions)
    if (response.ok) {
      const data = await response.json()
      setMaxConfidence(data)
    }
  }

  function filterByStatus(audio){
    return filter === 'All' || audio.status === filter
  }

  function filterByDate(audio){
    return ((new Date(audio.date_created) >= new Date(start)) && (new Date(audio.date_created) <= new Date(end)))
  }

  function sortPlaylist(a, b) {
    if (sort === "Confidence") {
      return b.confidence - a.confidence
    } else {
      return 0
    }
  }
  async function deleteSelected() {
    function filterBySelected(audio) {
      return checked.includes((audio.id).toString())
    }
    
    const selected = playlist.filter((audio) => filterBySelected(audio))

    if (selected.length > 0) {

      var confirmation = window.confirm("Are you sure you want to delete these files?")
      if (confirmation) {
        setDeleting(true)
        for (let i = 0; i<selected.length; i++) {
          const requestOptions = {
            method: "DELETE",
            headers: {Authorization: "Bearer " + token}
          }
          await fetch(`http://localhost:8000/api/delete-audio/${selected[i].filename}`, requestOptions)
          
        }
        setChecked([])
        setDeleting(false)
        getAudio()
      }
    }
  }

  async function getUserLabels() {
    const requestOptions = {
      method: "GET",
      headers: {'Content-Type': 'application/json', Authorization: "Bearer " + token}
    }
    const response = await fetch(`http://localhost:8000/api/settings/labels`, requestOptions)
    if (response.ok) {
      const data = Object.keys(await response.json())
      data.unshift('All')
      setLabels(data)
    } 
  }

  const handleTag = async (e) => {
    setTag(e)
  }


  const handleSelectAll = () => {
    var updatedList = []
    // console.log(playlist.filter((audio) => filterByDate(audio)).filter((audio) => filterByStatus(audio)))
    var filtered_playlist = playlist.filter((audio) => filterByDate(audio)).filter((audio) => filterByStatus(audio))

    if (!all) {
      for (var audio in filtered_playlist) {
        updatedList.push(filtered_playlist[audio].id.toString())
      }
      setChecked(updatedList)
    } else {
      setChecked([])
    }
    setAll(!all)
  }

  return (
    <span className={styles.block}>
      <div className={styles.audio_selection}>
        <div className={styles.files}>
          <Filter display={display}
                  setDisplay={setDisplay}
                  setFilter={setFilter}
                  setSort={setSort}
                  handleTag={handleTag}
                  labels={labels}
                  start={start}
                  setStartTime={setStartTime}
                  end={end}
                  setEndTime={setEndTime}
                  handleSelectAll={handleSelectAll}
                  checked={checked}
                  deleteSelected={deleteSelected}
                  deleting={deleting}
          />

          <Playlist display={display}
                    playlist={playlist}
                    filterByDate={filterByDate}
                    filterByStatus={filterByStatus}
                    sortPlaylist={sortPlaylist}
                    setAudioID={setAudioID}
                    audio_id={audio_id}
                    setAudio={setAudio}
                    audio_file={audio_file}
                    setChecked={setChecked}
                    checked={checked}
                    updateAudio={updateAudio}
                    deleteItem={deleteItem}
                    token={token}
                    reload={reload}
                    setReload={setReload}
                    gridFalse={gridFalse}
                    state={state}
                    maxConfidence={maxConfidence}
                    />

          <Upload token={token}
                  getAudio={getAudio}
                  upload={upload}
                  setUpload={setUpload}
                  state={state}
                  setState={setState}/>
        </div>
      </div>
    </span>);
  }