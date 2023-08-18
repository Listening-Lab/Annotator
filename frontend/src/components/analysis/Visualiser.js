import React, { useState, useEffect, useContext } from 'react'
import { UserContext } from "../../context/UserContext"
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2'
// import CircularLoader from '../../utils/CircularLoader'
import styles from './visualiser.module.css'

ChartJS.register(ArcElement, Tooltip, Legend);

export default function Visualiser(colours) {
    const [token,] = useContext(UserContext)

    const [values, setValues] = useState(null)
    const [keys, setKeys] = useState(null)
    const [total, setTotal] = useState(null)

    const [labels, setLabels] = useState(null)
    const [annotations, setAnnotations] = useState(null)

    const [val, setVal] = useState(null)

    const options = {
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            enabled: true
          }
        },
        radius: 90,
        animation : {
          duration: 500,
          easing: 'easeInOutSine'
        }
      }


    const status_data = {
        labels: keys,
        datasets: [
            {data: values,
            backgroundColor: [
                'rgba(159, 212, 161, 0.6)',
                'rgba(176, 53, 53, 0.6)'],
            borderColor: [
                'rgba(159, 212, 161, 1)',
                'rgba(176, 53, 53, 1)']
            }]
    }

    const annotations_data = {
        labels: labels,
        datasets: [
            {data: annotations,

            backgroundColor: Object.values(colours.colours),
                
            borderColor: Object.values(colours.colours)}]
    }

    const val_data = {
        labels: ['total','val'],
        datasets: [
            {data: [total-val, val],
            backgroundColor: [
                'rgba(159, 212, 161, 0.6)',
                'rgba(176, 53, 53, 0.6)'],
            borderColor: [
                'rgba(159, 212, 161, 1)',
                'rgba(176, 53, 53, 1)']
            }]
    }

    useEffect(() => {
        // console.log("VISUALISER")
        // console.log(Object.values(colours.colours))
        getData()
        getAnnotations()
        getVal()
    },[])

    const getData = async () => {
        const requestOptions = {
            method: "GET",
            headers: {Authorization: "Bearer " + token}
        }

        const response = await fetch('http://localhost:8000/api/visualise/status', requestOptions)
        const data = await response.json()
        setTotal(data.stats.total)
        setValues(Object.values(data.stats.dist))
        setKeys(Object.keys(data.stats.dist))
    }

    const getAnnotations = async () => {
        const requestOptions = {
            method: "GET",
            headers: {Authorization: "Bearer " + token}
        }

        const response = await fetch('http://localhost:8000/api/visualise/annotations', requestOptions)
        const data = await response.json()
        setAnnotations(Object.values(data.stats))
        setLabels(Object.keys(data.stats))
    }

    const getVal = async () => { //PROBLEM
        const requestOptions = {
            method: "GET",
            headers: {Authorization: "Bearer " + token}
        }

        const response = await fetch('http://localhost:8000/api/visualise/val', requestOptions)
        const data = await response.json()
        setVal(data.stats.validation) //HERE
    }



    return (
        <div className={styles.stats}>
            { total > 0 ?
            <div>
                <label>Total number of regions: {total}</label>
                <div styles={styles.doughnut}>< Doughnut data={status_data} options={options}/></div>
                <hr/>
                <label>Annotations:</label>
                <div styles={styles.doughnut}>< Doughnut data={annotations_data} options={options}/></div> 
                <hr/>
                <label>Training/Validation:</label>  
                <div styles={styles.doughnut}>< Doughnut data={val_data} options={options}/></div>
            </div> :
            <div>
                <h3>Upload audio files</h3>
            </div>
            }
        </div> 
    )
}