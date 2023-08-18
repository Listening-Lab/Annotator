import React, { useState, useEffect, useRef, useContext, useLayoutEffect } from 'react';
import { UserContext } from "../../context/UserContext"
import WaveSurfer from "wavesurfer.js"
import * as WaveSurferSpectrogramPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.spectrogram'
// import * as WaveSurferRegionsPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.regions'
import colormap from 'colormap'
import EditLabels from '../Label'
// import Overlay from '../../utils/Overlay'
import { tick_icon, trash_icon } from '../../utils/icons';
import './view.css'


export default function Wave({index, audio, setGrid, setAudio, handlePointClick, search, setSearch, deleted, setDeleted, refresh, setColours}) {
    const wavesurfer = useRef(false)
    const ref = useRef(null)
    const [info, setInfo] = useState(false)
    const [token,] = useContext(UserContext)
    const color = colormap({colormap: 'jet',
                            nshades: 256,
                            format: 'float'})

    // Label Editor
    const [label, setLabel] = useState('unknown')
    const [status, setStatus] = useState('Automatic')
    const [edit, setEdit] = useState(false)
    const [classes, setClasses] = useState(['possum', 'mustelid', 'rat'])
    const [x, setX] = useState(0)
    const [y, setY] = useState(0)

    const [px, setPX] = useState(0.0)
    const [py, setPY] = useState(0.0)

    useEffect(() => {
        const getLabel = async () => {
            const requestOptions = {
                method: "GET",
                headers: {Authorization: "Bearer " + token}
              }
              const response = await fetch(`http://localhost:8000/api/seg/${audio.filename}`, requestOptions)
              if (response.ok) {
                var data = await response.json()
                console.log(data)
                setStatus(data.status)
                setLabel(data.label)
                setPX(data.x)
                setPY(data.y)
              }
        }
        getLabel()
    },[refresh])

    useLayoutEffect(() => {
        if (ref.current) {
            const handleInstance = async () => {
                var audio_instance = await getAudio()
                await wavesurferInstance(index, audio_instance)
                if (wavesurfer.current) {
                    wavesurfer.current.load(audio_instance)
                }
            }
            handleInstance()
        }
        // console.log(wavesurfer.current)
        if(wavesurfer.current) {
            return () => wavesurfer.current.destroy()
        }
    },[refresh]);

    async function getAudio() {
        const requestOptions = {
          method: "GET",
          headers: {Authorization: "Bearer " + token}
        }
  
        const response = await fetch(`http://localhost:8000/api/segments/${audio.filename}`, requestOptions)
        if (response.ok) {
            const data = await response.blob()
            let audio = new Audio()
            audio.src = URL.createObjectURL(data)
            return audio
        }
    }

    const wavesurferInstance = async (index) => {
        if (document.querySelector(`#wave_${index}`)) {
            wavesurfer.current = WaveSurfer.create({
                container: document.querySelector(`#wave_${index}`),
                waveColor: '#a3afc2',
                progressColor: '#19468c',
                cursorColor: '#19468c',
                barWidth: 2,
                barRadius: 1,
                cursorWidth: 3,
                height: 50,
                barGap: 2,
                hideScrollbar:true,
                fillParent:true,
                normalize: true,
                responsive: true,
              
                plugins: [
                  WaveSurferSpectrogramPlugin.create({
                    wavesurfer: wavesurfer.current,
                    container: document.querySelector(`#spec_${index}`),
                    colorMap: color,
                    fftSamples: 512,
                  })]
              })
        }
    }

    const handleExit = async (e) => {
        if (e.relatedTarget !== null) {
            if (wavesurfer.current && (e.relatedTarget.tagName === 'DIV' && (e.target.tagName === 'CANVAS' || e.target.tagName === 'WAVE'))) {
                setEdit(false)
                wavesurfer.current.pause()
            } else if (e.target.tagName === 'FOOTER' && e.relatedTarget.tagName !== 'SELECT') {
                setEdit(false)
            }
        }
        updateSegment(e)
    }

    const handleLabel = async (e) => {
        console.log('UPDATED!')
        e.stopPropagation()
        if (wavesurfer.current) {
            wavesurfer.current.pause()
        }

        const handleCtrlClick = () => {
            if (label === 'unknown') {
                setLabel(classes[1].label) // Replace with "default label" in user settings
            } else {
                setLabel('unknown')
            }
        }

        const handleShiftClick = () => {
            if (label === 'unknown') {
                setLabel(classes[2].label) // Replace with "secondary label" in user settings
            } else {
                setLabel('unknown')
            }
        }

        const handleEdit = () => {
            const update = (e) => {
                if (edit === false) {
                    setX(e.clientX)
                    setY(e.clientY)
                }
                setEdit(true)
              }
            update(e)
        }

        if (e.ctrlKey) {
            handleCtrlClick()
        } else if (e.shiftKey) {
            handleShiftClick()
        } else {
            handleEdit()
        }
        // e.ctrlKey ?  handleCtrlClick() : handleEdit()
        // e.shiftKey ?  handleShiftClick() : handleEdit()

        await updateSegment()
    }

    const updateSegment = async () => {
        const requestOptions = {
            method: "PUT",
            headers: {Authorization: "Bearer " + token,
                      'Content-Type': 'application/json'},
            body: JSON.stringify({"filename": audio.filename,
                                  "status": label === 'unknown' ? 'Incomplete' : 'Complete',
                                  "validation": false,
                                  "start": audio.start,
                                  "end": audio.end,
                                  "confidence": audio.confidence,
                                  "label": label,
                                  "x": px,
                                  "y": py,
                                  "cluster": audio.cluster,})
          }
          const response = await fetch(`http://localhost:8000/api/seg/${audio.filename}`, requestOptions)

          if (response.ok) {
            console.log('Segment Updated')
          }
    }

    const handleChange = async (e) => {
        if (e.relatedTarget !== null) {
            if (wavesurfer.current && (e.relatedTarget.tagName === 'DIV' && (e.target.tagName === 'CANVAS' || e.target.tagName === 'WAVE'))){
                wavesurfer.current.play()
                setEdit(false)
            } else if (e.relatedTarget.tagName === 'FOOTER') {
                console.log("label changer")
            }
        }   
    }

    const handleAudio = async (e) => {
        e.stopPropagation()
        setSearch(!search)
        console.log('view recording')
        setGrid(false)

        const requestOptions = {
            method: "GET",
            headers: {Authorization: "Bearer " + token}
          }
          const response = await fetch(`http://localhost:8000/api/parent/${audio.filename}`, requestOptions)
          const data = await response.json()

          if (response.ok) {
            console.log(data.filename,data.id)
            handlePointClick(data.filename, data.id)
          }
    }

    const handleInfo = async (e) => {
        e.stopPropagation()
        setInfo(!info) 
    }

    const handleDelete = async (e) => {
        e.stopPropagation()
        const requestOptions = {
            method: "DELETE",
            headers: {Authorization: "Bearer " + token}
          }
        const response = await fetch(`http://localhost:8000/api/seg/${audio.filename}`, requestOptions)
        if (response.ok) {
        console.log('Segment deleted')
        setDeleted(!deleted)
        setInfo(false)
        }
    }

    return  (
        <div ref={ref} 
             className="wavesurfer_card" 
             onMouseOver={(e) => handleChange(e)}
             onMouseOut={(e) => handleExit(e)} 
             onClick={(e) => handleLabel(e)}>

            <div className='info_container' >
                {info ? <div className='info_panel'>
                    <h1>{label}</h1>
                    <button className='info' onClick={(e) => handleAudio(e)}>View Recording</button>
                    <button className='delete' onClick={(e) => handleDelete(e)}><img src={trash_icon} alt=''></img></button>
                </div> : null}
                <button className='info_button' onClick={(e) => handleInfo(e)}>{info ? 'x' : 'i'}</button>
            </div>

            { ((status !== 'automatic') && (label !== 'unknown')) ? <div className='overlay'><img className='tick' src={tick_icon} alt=''></img></div> : null }

            <div id={`spec_${index}`}></div>
            <div id={`wave_${index}`} style={{height:'0px'}}></div>

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
        </div>
    )
}