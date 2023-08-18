import React, {useState, useRef, useEffect, useContext} from 'react'
import WaveSurfer from "wavesurfer.js"
import * as WaveSurferRegionsPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.regions'
import * as WaveSurferTimelinePlugin from 'wavesurfer.js/dist/plugin/wavesurfer.timeline'
// import * as WaveSurferCursorPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.cursor'
import * as WaveSurferSpectrogramPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.spectrogram'
import colormap from 'colormap'

import Header from './header/Header'
import AudioSelection from "./selection/Selection"
import AudioAnalysis from "./analysis/Analysis"
import PointMap from "./pointMap/PointMap"
import View from "./view/View"
import Timestamps from './playback/Timestamps'
import Overlay from '../utils/Overlay'

import { UserContext } from "../context/UserContext"

import styles from './waveform.module.css'
import region from './analysis/region.module.css'
// import Loader from '../utils/Loader'
import EditLabels from './Label'
import { back_icon, plot_icon, kmeans, no_kmeans, play_icon, pause_icon } from "../utils/icons"
import Tour from './Tour'
const formatDuration = s => {
  let ms = s*1000
  if (ms < 0) ms = -s;
  const time = {
    minute: Math.floor(ms / 60000) % 60,
    second: Math.floor(ms / 1000) % 60,
    millisecond: Math.trunc((Math.floor(ms) % 1000)/100)

  };
  return(`${time.minute}:${time.second < 10 ? `0${time.second}`:`${time.second}`}.${time.millisecond}`)
};

export default function Waveform() {
  const wavesurfer = useRef(null)
  const [token,] = useContext(UserContext)
  const [audio_file, setAudio] = useState(null)
  const [audio_id, setAudioID] = useState(null)
  const [id, setID] = useState('')
  const [classes, setClasses] = useState([])
  const [search, setSearch] = useState(false)
  const [reload, setReload] = useState(false)
  const [update, setUpdate] = useState(false)
  const [edit, setEdit] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [x, setX] = useState()
  const [y, setY] = useState()
  const [state, setState] = useState(false)
  const [start, setStart] = useState(null)
  const [end, setEnd] = useState(null)
  const [label, setLabel] = useState('')
  const [duration, setDuration] = useState('00:00')
  const [time, setTime] = useState('00:00')
  const [editRegion, setEditRegion] = useState(null)
  const [playlist, setPlaylist] = useState([])
  const [settings, setSettings] = useState(false)
  const [training, setTraining] = useState(false)

  const [grid, setGrid] = useState(false)
  const [gridFalse, setGridFalse] = useState(true)
  const [tag, setTag] = useState('All')
  const [info, setInfo] = useState(false)

  const color = colormap({colormap: 'jet',
                          nshades: 256,
                          format: 'float'})

  const [point, setPoints] = useState(false)

  const [cluster, setCluster] = useState(false)

  const [colours, setColours] = useState({})

  const [restart, setRestart] = useState(false)

  useEffect(() => {
    // Initial render
    wavesurfer.current = WaveSurfer.create({
      container: document.querySelector('#waveform'),
      waveColor: '#a3afc2',
      progressColor: '#19468c',
      cursorColor: '#19468c',
      barWidth: 2,
      barRadius: 1,
      cursorWidth: 3,
      height: 450,
      barGap: 2,
      fillParent: true,
      hideScrollbar:true,
      normalize: true,
      responsive: true,

      plugins: [
        WaveSurferSpectrogramPlugin.create({
          wavesurfer: wavesurfer.current,
          container: document.querySelector('#waveform'),
          colorMap: color,
          height:600
        }),

        WaveSurferRegionsPlugin.create({
          maxlength: 5,
          minlength: 5
        }),

        // WaveSurferTimelinePlugin.create({
        //   container: document.querySelector('#waveform'),
        //   height: 20,
        // })
      ]
    })
    return () => wavesurfer.current.destroy()
  },[point, audio_file, gridFalse])

  useEffect(() => {
    // Set start/end to null to remove spec highlight
    setStart(null)
    setEnd(null)
    setEdit(false)

    // Create wavesurfer audio instance
    if (wavesurfer.current && audio_file !== null) { 
      wavesurfer.current.clearRegions()
      async function getAudio() {
        const requestOptions = {
          method: "GET",
          headers: {Authorization: "Bearer " + token}
        }
  
        const response = await fetch(`http://localhost:8000/api/get-audio/${audio_file}`, requestOptions)
        if (response.ok) {
          const data = await response.blob()
          let audio = new Audio()
          audio.src = URL.createObjectURL(data)
          wavesurfer.current.load(audio)
          // wavesurfer.current.spectrogram.init()
        }
      }

      getAudio()

      wavesurfer.current.on('ready', function() {
        setDuration(wavesurfer.current.getDuration())
        let rawDuration = wavesurfer.current.getDuration()
        setDuration(formatDuration(rawDuration))
        document.onkeydown = function handleKeyEvents(e) {
          if (wavesurfer.current) {
            if (e.code === "Space") {
              // console.log("Play/Pause")
              wavesurfer.current.playPause()
            }
            if (e.code === "KeyA") {
              // console.log("Rewind 1 sec")
              wavesurfer.current.skipBackward(1)
            }
            if (e.code === "KeyD") {
              // console.log("skip 1 sec")
              wavesurfer.current.skipForward(1)
            }
      
          }
        }
        
        wavesurfer.current.on('audioprocess', function() {
          if (wavesurfer.current.isPlaying()) {
            let rawTime = wavesurfer.current.getCurrentTime()
            setTime(formatDuration(rawTime))
          }
        })

        // Create new region if there is a double click
        wavesurfer.current.drawer.on('dblclick', async function() {
          var position = wavesurfer.current.getCurrentTime();
          if (position > 0) {
            if (position < 2.5) {
              position = 2.5
            } else if (position > 297.5) {
              position = 297.5
            }
            // Find smallest number not in use for given file's regions when creating a new region
            const regions = Object.values(wavesurfer.current.regions.list)
            const nums = []
            for (let index = 0; index < regions.length; index++) {
              let split_string = ((regions[index].attributes.filename).split("_"))
              nums.push(parseInt(split_string[split_string.length-1].slice(1,-4)))
            }
            let min = findNumber(nums)
            const region_name = (String(audio_file)).slice(0,-4).concat(`_R${min}`).concat((String(audio_file)).slice(-4))
            console.log(classes)
            var region = wavesurfer.current.addRegion({
              start: position - 2.5,
              end: position + 2.5,
              data:'unknown',
              resize: false,
              attributes:  {"confidence": 1,
                            "filename": region_name,
                            "x": 0,
                            "y": 0, 
                            "status": 'new'},
              color: `${colours['unknown']}`,
            });
            setEditRegion(region)
            console.log(`${region.attributes.filename} created`)
            const regionCreate = async () => {
              region.attributes.status = "user"
              const requestOptions = {
                method: "POST",
                headers: {Authorization: "Bearer " + token,
                          'Content-Type': 'application/json'},
                body: JSON.stringify({"filename": region.attributes.filename,
                                    "status": region.attributes.status,
                                    "validation": false,
                                    "start": region.start,
                                    "end": region.end,
                                    "confidence": region.attributes.confidence,
                                    "label": label,
                                    "cluster": 1,
                                    "x": region.attributes.x,
                                    "y": region.attributes.y})
              }
              const response = await fetch(`http://localhost:8000/api/user-seg/`, requestOptions)
              if (!response.ok) {
                console.log(response)
              } 
            }
            if (region.attributes.status === "new") {
              await regionCreate()
            } 
          }
        })
      })

      function findNumber(values) {
        let result = [];
        for (let i = 0; i < values.length; ++i) {
          if (0 <= values[i]) {
            result[values[i]] = true;
          }
        }
        for (let i = 1; i <= result.length; ++i) {
          if (undefined === result[i]) {
            return i;
          }
        }
        return 1
      }

      // Handle removing a region from the database and from the wavesurfer
      const handleRemove = async (region) => {
        region.remove()
        const requestOptions = {
          method: "DELETE",
          headers: {Authorization: "Bearer " + token}
        }
        const response = await fetch(`http://localhost:8000/api/seg/${region.attributes.filename}`, requestOptions)
        if (response.ok) {
          console.log(`${region.attributes.filename} deleted`)
        }
      }

      // If a region is clicked then set it as the active region for editing. If shift is held then loop, if ctrl is held then delete, else play
      wavesurfer.current.on('region-click', function(region, e) {
        e.stopPropagation()
        setID(region.id)
        setStart(region.start)
        setEnd(region.end)
        setLabel(region.data)
        setEditRegion(region)
        e.shiftKey ? region.playLoop() : region.play()
        e.ctrlKey ? handleRemove(region) : region.play()
        const update = (e) => {
          setEdit(true)
          setX(e.x)
          setY(e.y)
        }
        update(e)
      })
      
      // Set region to updated once it is finalised
      wavesurfer.current.on('region-update-end', function(region, e) {
        e.stopPropagation()
        setID(region.id)
        setStart(region.start)
        setEnd(region.end)
        setLabel(region.data)
        setEditRegion(region)
      })

      // Handle play/pause of audio
      wavesurfer.current.on('play', function(){
        setPlaying(true)
      })

      wavesurfer.current.on('pause', function(){
        setPlaying(false)
      })

      wavesurfer.current.on('finish', function(){
        setPlaying(false)
      })

      // On refresh, generate all existing regions for an audio file onto the wavesurfer instance
      async function getRegions() {
        const requestOptions = {
          method: "GET",
          headers: {Authorization: "Bearer " + token}
        }
        const response = await fetch(`http://localhost:8000/api/child/${audio_file}`, requestOptions)
        if (response.ok) {
          const data = await response.json()
          wavesurfer.current.clearRegions()
          for (const region of data) {
            if (region.confidence) {
              wavesurfer.current.addRegion({
                start: region.start,
                end: region.end,
                data: region.label,
                resize: false,
                attributes: {"confidence": region.confidence,
                              "filename": region.filename,
                              "status": region.status,
                              "x": region.x,
                              "y": region.y,
                              "cluster": region.cluster,
                              "label": region.label},
                color: `${colours[region.label]}`,
                drag: true
              })
            }
          }
        }
      }
      getRegions()
    }
  },[audio_file, point, gridFalse])

  useEffect(() => {
    if (id && label!==null) { 
      if (wavesurfer.current.regions.list[id]){
        wavesurfer.current.regions.list[id].update({
          start: start,
          end: end,
          data: label,
          color: `${colours[label]})`
        })

        setState(!state)
      }
    }
  },[start, end, label])

  useEffect(() => {
    const updateRegion = async () => {
      const requestOptions = {
        method: "PUT",
        headers: {Authorization: "Bearer " + token,
                  'Content-Type': 'application/json'},
        body: JSON.stringify({"filename": editRegion.attributes.filename,
                              "status": label === 'unknown' ? 'Incomplete' : 'Complete',
                              "validation": false,
                              "start": editRegion.start,
                              "end": editRegion.end,
                              "confidence": editRegion.attributes.confidence,
                              "label": label,
                              "cluster": 1,
                              "x": editRegion.attributes.x,
                              "y": editRegion.attributes.y})
      }
      const response = await fetch(`http://localhost:8000/api/seg/${editRegion.attributes.filename}`, requestOptions)
      if (response.ok) {
        console.log(`${editRegion.attributes.filename} updated`)
      }
    }
    if (editRegion) {
      if (label !== null) {
        updateRegion()
        setLabel(null)
      }
      // setReload(!reload)
    }
  }, [state])

  useEffect(() => {
    setReload(!reload)
  }, [label, editRegion])

  useEffect(() => {
    for (const region of Object.values(wavesurfer.current.regions.list)) {
      region.update({color: `${colours[region.data]}`})  
    }
  }, [colours])

  // Handle viewing pointmap
  const handlePoints = async (e) => {
    console.log("point map")
    e.preventDefault()
    setPoints(!point)
  }

  // Handle going to file view when a point is clicked
  const handlePointClick = (filename, audio_id) => {
    setPoints(false)
    setAudio(filename)
    setAudioID(audio_id)
  }

  // Handle kmeans clustering view on pointmap
  const clustering = async () => {
    setCluster(!cluster)
    setUpdate(!update)
  }

  const toggle = () => {
    wavesurfer.current.playPause()
  }

  return (
    <div className="tour-start">
      <div style={{position: "fixed", display:"block", height: "50px", width: "100%", top:"0px", zIndex:50}}>
        < Header token={token}
                wavesurfer={wavesurfer}
                grid={grid} 
                setGrid={setGrid}
                gridFalse={gridFalse}
                setGridFalse={setGridFalse}
                tag={tag} 
                setTag={setTag}
                search={search}
                setSearch={setSearch}
                setEditRegion={setEditRegion}
                classes={classes}
                setClasses={setClasses}
                setColours={setColours}
                restart={restart}
                setRestart={setRestart}
                settings={settings}
                setSettings={setSettings}
                training={training}
                setTraining={setTraining}/>
      </div>
      <Tour restart={restart} setRestart={setRestart}/>
      <EditLabels 
        label={label} 
        setLabel={setLabel} 
        token={token} 
        edit={edit}
        setEdit={setEdit} 
        classes={classes}
        setClasses={setClasses}
        x={x} 
        y={y}
        setColours={setColours}/>

      { grid ? <View grid={grid} setGrid={setGrid} setAudio={setAudio} handlePointClick={handlePointClick} tag={tag} search={search} setSearch={setSearch} setColours={setColours}/> : (
        <div className={styles.noscroll}>
          <div className={styles.wrapper}>
            <div className={styles.blocks}>
              <AudioSelection
                audio_file={audio_file}
                setAudio={setAudio} 
                audio_id={audio_id}
                setAudioID={setAudioID}
                update={update}
                reload={reload}
                setReload={setReload}
                gridFalse={gridFalse}
                state={state}
                setState={setState}
                playlist={playlist}
                setPlaylist={setPlaylist}/>
                            
              <div className={styles.block_wide} style={{paddingRight: "100px"}}>
                <div className='tour-wave' style={{width: "100%", display: "flex", flexDirection: "column", alignItems: "center"}}>
                  <div className={styles.wave_block}>
                    <div className={styles.buttons}>
                      <div>
                        {playlist.length > 0 ? <button onClick={(e) => handlePoints(e)} className='tour-plot'>{point ? <img src={back_icon} alt='back'></img> : <img src={plot_icon} alt='plots'></img>}</button>: null}
                        {point ? <button onClick={(e) => clustering(e)}>{cluster ? <img src={no_kmeans} alt='back'></img> : <img src={kmeans} alt='plots'></img>}</button> : <></>}
                      </div>
                      {point ? null : <h3 style={{marginLeft: '10px'}}>{audio_file}</h3>}
                    </div>
                    {point ? <div className={styles.placeholder}><PointMap handlePointClick={handlePointClick} update={update} cluster={cluster} colours={colours}/></div> : null} 
                    <div style={point ? {display:'none'}: {}} className={styles.waveform}>
                      <div id='waveform'></div>
                      {/* <div id='spectrogram'></div>
                      <div id='timeline'></div> */}
                    </div>

                    <Overlay start={start}
                              end={end}
                              duration={300}/>
                  </div>

                  <span className={styles.time_panel}>
                    <button className={styles.infoButton} onClick={() => setInfo(!info)}><p className='tour-info'>i</p></button>
                    <div className={styles.container} style={point ? {display:'none'}: {}}>
                      <button onClick={() => toggle()}><img src={playing ? pause_icon : play_icon} alt='play/pause' /></button>
                    </div>
                    <div className={region.panel} style={point ? {display:'none'}: {}}>
                      <Timestamps time={time} duration={duration}></Timestamps>
                    </div>
                  </span>
                </div>
              </div>


              {info ?
              <AudioAnalysis 
                  start={start}
                  end={end}
                  colours={colours}
                  settings={settings}
                  training={training}/>:null}
            </div>
          </div>
        </div>
      )}        
    </div>
  )
}