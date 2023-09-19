// BUG - Audio status incorrectly set to "Incomplete"

import React, { useState, useEffect, useContext } from 'react'
import { UserContext } from "../../context/UserContext"
import { Chart as ChartJS, ArcElement} from 'chart.js';
import { Doughnut } from 'react-chartjs-2'
import styles from './selection.module.css'

ChartJS.register(ArcElement);

export default function Confidence({audio, audio_id, reload, gridFalse, updateAudio, state, maxConfidence}) {
  const [regions, setRegions] = useState([])
  const [token] = useContext(UserContext)
  const [confidence, setConfidence] = useState(audio.confidence)
  const [completion, setCompletion] = useState(audio.completion)
  const [render, setRender] = useState(false)
  const [confidence_data, setConfidenceData] = useState({
    labels: ['confidence', '1-confidence'],
    datasets: [
        {data: [confidence, confidence === 1 ? 0 : 1-confidence],
          backgroundColor: [
            'rgb(103, 139, 255)',
            'rgb(178, 214, 255)'],
          hoverColor: [
              'rgba(159, 212, 161, 1)',
              'rgba(176, 53, 53, 1)'],
          borderWidth:0,
        }]})

  const [completion_data, setCompletionData] = useState({
    labels: ['completion', '1-completion'],
    datasets: [
        {data: [completion, completion === 1 ? 0 : 1-completion],
          backgroundColor: [
              'rgba(159, 212, 161, 1)',
              'rgba(176, 53, 53, 1)'],
          hoverColor: [
              'rgba(159, 212, 161, 1)',
              'rgba(176, 53, 53, 1)'],
          borderWidth:0,
        }]})
  
  const [confidenceOptions] = useState({
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: false,
        // hover:false
      },
      title: {
        display: false,
        text:'Confidence'
      }
    },
    radius: 20,
    animation : {
      duration: 500,
      easing: 'easeInOutSine'
    },
  })

  const [completionOptions] = useState({
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: false,
        // hover:false
      },
      title: {
        display: false,
        text:'Completion'
      }
    },
    radius: 20,
    animation : {
      duration: 500,
      easing: 'easeInOutSine'
    },
  })

  async function getRegions() {
    const requestOptions = {
      method: "GET",
      headers: {Authorization: "Bearer " + token}
    }
    const response = await fetch(`http://localhost:8000/api/child/${audio.filename}`, requestOptions)
    if (response.ok) {
      const data = await response.json()
      setRegions(data)
    }
  }

  useEffect(() => {
    getRegions()
  },[gridFalse])

  useEffect(() => {
    if (audio_id !== null) {
      if (audio.id === audio_id) {
        getRegions()
      } else if (render) {
        getRegions()
        setRender(false)
      }
    } else {
      getRegions()
    }

  },[reload])

  useEffect(() => {
    async function processConfidence() {
      if (regions.length > 0) {
        let total = 0
        for (let i=0; i < regions.length; i++) {
          const region = regions[i];
          total = total + region.confidence
        }
        setConfidence(total/regions.length)
      } 
    }

    async function processCompletion() {
      if (regions.length > 0) {
        let total = 0
        for (let i=0; i < regions.length; i++) {
          if (regions[i].status === 'Complete') {
            total++
          }
        }
        setCompletion(total/regions.length)
      }
    }
    if (audio_id !== null) {
      processConfidence()
      processCompletion()
    }
  },[regions,state])

  useEffect(() => {
    setConfidenceData({
      labels: ['confidence', '1-confidence'],
      datasets: [
          {data: [confidence, maxConfidence-confidence],
            backgroundColor: [
              'rgb(103, 139, 255)',
              'rgb(178, 214, 255)'],
          }]})
    // if (audio_id !== null) { //ERROR HERE - status incorrectly changed to "Incomplete"
    //   updateAudio(audio, audio.validation, confidence, completion)
    // }
  },[confidence])

  useEffect(() => {
    setCompletionData({
      labels: ['completion', '1-completion'],
      datasets: [
          {data: [completion, completion === 1 ? 0 : 1-completion],
            backgroundColor: [
              'rgb(154, 188, 154)',
              'rgb(224, 143, 133)'],
          }]})
    if (audio_id !== null) { //ERROR HERE - status incorrectly changed to "Incomplete"
      updateAudio(audio, audio.validation, confidence, completion)
    }
  },[completion])


  return (
    <div className={styles.row}>
      <p className={styles.name}>{audio.filename}</p>
      <div className={styles.pie_container}>
        <div className={styles.pie} >< Doughnut data={confidence_data} options={confidenceOptions}/></div>
        {/* <div className={styles.pie} >< Doughnut data={completion_data} options={completionOptions}/></div> */}
      </div>
    </div>
    
  )
}