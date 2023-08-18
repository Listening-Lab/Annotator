import React, {useEffect, useState, useContext, useRef} from 'react'
import {
    Chart as ChartJS,
    LinearScale,
    PointElement,
    Tooltip,
    Legend,
  } from 'chart.js';
  import { Bubble, getElementAtEvent } from 'react-chartjs-2';
import { UserContext } from "../../context/UserContext"
// import styles from './pointmap.module.css'
// import AudioSelection from '../selection/Selection';

ChartJS.register(LinearScale, PointElement, Tooltip, Legend);

export default function PointMap({handlePointClick, update, cluster, colours}) {
    const pointRef = useRef()
    const [maxX, setMaxX] = useState(0)
    const [maxY, setMaxY] = useState(0)
    const [data, setData] = useState({
        datasets: [{
            label: '',
            data: [],
            backgroundColor: '',
        },]
    })
    const [options] = useState({
        animation: {
            duration: 100,
            easing: 'easeInCirc'
        },
        scales: {
            x: {
                ticks: {
                    display: false,
                    maxTicksLimit: 3
                },
                display: true,
                grid: {
                    display:true
                },
            },
            y: {
                ticks: {
                    display: false,
                    maxTicksLimit: 3
                },
                display: true,
                grid: {
                    display:true
                },
            }
        },
        plugins: {
            legend: {
              display: false
            }
          },
        events: ['click', 'mousemove'],
    })

    const onClick = (e) => {
        try {
            var id = getElementAtEvent(pointRef.current, e)[0].datasetIndex
            var filename = data.datasets[id].label
            
            const getParent = async () => {
                const requestOptions = {
                    method: "GET",
                    headers: {Authorization: "Bearer " + token}
                  }
                  const response = await fetch(`http://localhost:8000/api/parent/${filename}`, requestOptions)
                  const data = await response.json()
        
                  if (response.ok) {
                    console.log(data.filename, data.id)
                    handlePointClick(data.filename, data.id)
                  }
            }

            getParent()

        } catch (error) {
            console.log(error)}
    }

    const [token,] = useContext(UserContext)

    useEffect(() => {
        // retrieve point map on first render
        getPoints()
        
    },[update, colours])

    useEffect(() => {
        options.scales.x.min = -1.1*maxX
        options.scales.x.max = 1.1*maxX
        options.scales.y.min = -1.1*maxY
        options.scales.y.max = 1.1*maxY
    },[maxX, maxY])

    // API to return point map object (json)
    const getPoints = async () => {
        const requestOptions = {
            method: "GET",
            headers: {'Content-Type': 'application/json', Authorization: "Bearer " + token}
        }
        
        const response = await fetch(`http://localhost:8000/api/points`, requestOptions)

        if (response.ok) {
            const recieved_data = await response.json()
            const new_datasets = []
            for (let i=0; i < recieved_data["datasets"].length; i++) {
                if (!cluster) {
                    new_datasets.push({
                        label: recieved_data["datasets"][i]["file"],
                        data: [{x: recieved_data["datasets"][i]["data"][0], y: recieved_data["datasets"][i]["data"][1], r: 10*(recieved_data["datasets"][i]["data"][2])}],
                        backgroundColor: colours[recieved_data["datasets"][i]["label"]],
                        cluster: 0,
                    })
                } else {
                    new_datasets.push({
                        label: recieved_data["datasets"][i]["file"],
                        data: [{x: recieved_data["datasets"][i]["data"][0], y: recieved_data["datasets"][i]["data"][1], r: recieved_data["datasets"][i]["data"][2]}],
                        backgroundColor: recieved_data["datasets"][i]["backgroundColor"],
                        cluster: recieved_data["datasets"][i]["cluster"],
                    })
                }
            }

            const new_data = {
                datasets: new_datasets}
            var x = 0
            var y = 0
            for (let j = 0; j < new_data.datasets.length; j++) {
                if (Math.abs(new_data.datasets[j].data[0].x) > x) {
                    x = Math.abs(new_data.datasets[j].data[0].x)
                }
                if (Math.abs(new_data.datasets[j].data[0].y) > y) {
                    y = Math.abs(new_data.datasets[j].data[0].y)
                }
            }
            
            setMaxX(x)
            setMaxY(y)

            setData(new_data)

        } else {
            console.log('An error occurred')
            console.log(response)
        }
    }

    return <Bubble ref={pointRef} onClick={onClick} options={options} data={data} redraw={true} />;    
}