import React, { useState, useContext, useEffect } from 'react'
import styles from './header.module.css'
import { UserContext } from "../../context/UserContext"
import { Line } from 'react-chartjs-2'

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
  } from 'chart.js';

  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
  );

export default function Export() {
    const [token,] = useContext(UserContext)
    const [exportStart, setExportStart] = useState('2020-01-01')
    const [exportEnd, setExportEnd] = useState('2200-01-01')
    const [message, setMessage] = useState('')
    const [stats, setTrainingStats] = useState({
        labels: null,
        datasets: [{
            label: null,
            data: null,
        }]
      })

    const [valStats, setValStats] = useState({
        labels: null,
        datasets: [{
            label: ['validation'],
            data: null,
        }]
        })

    const [loss, setLoss] = useState(null)
    const [accuracy, setAcc] = useState(null)
    const [valLoss, setValLoss] = useState(null)
    const [valAccuracy, setValAcc] = useState(null)

    const options = {
        scales: {
            y: {
            type: 'linear',
            display: true,
            position: 'left',
            height: null,
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                min:0, 
                max:100.0,
                scaleLabel: 'Accuracy',
                height: null,
            }
        }
    }

    const display = (data) => {
        setTrainingStats({
            labels: [...Array(data['loss'].length).keys()],
            datasets: [
              {
                label: "Loss",
                data: data['loss'],
                backgroundColor: "rgba(75,192,192,0.2)",
                borderColor: "rgba(75,192,192,1)",
                yAxisID: 'y'
              },
              {
                label: "Accuracy",
                data: data['accuracy'],
                backgroundColor: "#742774",
                borderColor: "#742774",
                yAxisID: 'y1'
              }
            ]
          })

        setValStats({
        labels: [...Array(data['val_loss'].length).keys()],
        datasets: [
            {
            label: "Validation Loss",
            data: data['val_loss'],
            backgroundColor: "rgba(75,192,192,0.2)",
            borderColor: "rgba(75,192,192,1)",
            yAxisID: 'y'
            },
            {
            label: "Validation Accuracy",
            data: data['val_accuracy'],
            backgroundColor: "#742774",
            borderColor: "#742774",
            yAxisID: 'y1'
            }
        ]
        })
    }

    const handleEport = async () => {
        const requestOptions = {
            method: "GET",
            headers: {Authorization: "Bearer " + token}
        }

        const response = await fetch(`http://localhost:8000/api/test/export/${exportStart}/${exportEnd}`, requestOptions)

        if (response.ok){
            const data = await response.blob()
            const href = URL.createObjectURL(data)
            const link = document.createElement('a')
            link.href = href
            link.download = "annotations.json"
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            setMessage('Annotations successfully downloaded')
        } else {
            setMessage('Something went wrong')
        }
    }

    const handleTraining = async () => {
        const requestOptions = {
            method: "GET",
            headers: {Authorization: "Bearer " + token}
        }

        const response = await fetch(`http://localhost:8000/api/test/train`, requestOptions)

        if (response.ok) {
            console.log("Model trained!")
            const data = await response.json()
            display(data)
            setLoss(data['loss'])
            setAcc(data['accuracy'])
            setValLoss(data['val_loss'])
            setValAcc(data['val_accuracy'])

            // Change audio status too prevent data leaks
            // const requestOptions = {
            //     method: "POST",
            //     headers: {Authorization: "Bearer " + token}
            // }
    
            // const status = await fetch(`http://localhost:8000/api/change_status/${exportStart}/${exportEnd}`, requestOptions)
            // if (status.ok) {
            //     setUpdate(!update)
            // }

        } else {
            console.log(response)
            setMessage('Insufficient training data')
        }
    }


    const handleModelExport = async () => {
        const requestOptions = {
            method: "GET",
            headers: {Authorization: "Bearer " + token}
        }

        const response = await fetch(`http://localhost:8000/api/model`, requestOptions)
        if (response.ok){
            const data = await response.blob()
            const href = URL.createObjectURL(data)
            const link = document.createElement('a')
            link.href = href
            link.download = "model.zip"
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            setMessage('Model successfully downloaded')
        } else {
            setMessage('Something went wrong')
        }
    }

    return (
        <div className={styles.export}>
            <h2>Export labels by date</h2>
            <div className={styles.export}>
                <label>Date:</label>
                <div>
                    <input required type="date" id="start" name="Start" value={exportStart} onChange={(e) => setExportStart(e.target.value)}/>
                    <label>-</label>
                    <input required type="date" id="end" name="End" value={exportEnd} onChange={(e) => setExportEnd(e.target.value)}/> 
                </div>
                <div className={styles.button} type='submit' onClick={() => handleEport()}>EXPORT</div>
                <hr></hr>
            </div>

            <div className={styles.export}>
                <h1>Training</h1>
                <h3>The model will only be trained on audio marked as "Complete" and within the date range</h3>

                <div className={styles.graph}><Line options={options} data={stats}/></div>
                <div className={styles.graph}><Line options={options} data={valStats}/></div>

                <span className={styles.row}>
                    <div className={styles.button} onClick={() => handleTraining()}>TRAIN</div>
                    <div className={styles.button} onClick={() => handleModelExport()}>EXPORT MODEL</div>
                </span>
                <h3>{message}</h3>
                
                <hr></hr>
            </div>
            
        </div>
    )
}