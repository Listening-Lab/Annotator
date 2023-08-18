import React, {useContext, useState, useEffect} from 'react'
import { UserContext } from '../../context/UserContext'
import styles from './resample.module.css'


export default function Resample() {
    const [sr, setSr] = useState(null)
    const [token,] = useContext(UserContext)

    useEffect(() => {
        console.log('set sample rate')

        const getSR = async () => {
            const requestOptions = {
                method: "GET",
                headers: {Authorization: "Bearer " + token}
            }
            const response = await fetch(`http://localhost:8000/api/settings/sample-rate/`, requestOptions)
            if (response.ok) {
                const data = await response.json()
                setSr(data)
            }
        }
        if (sr == null){
            getSR()
        }
    },[])

    const handleSR = async (rate) => {
        const requestOptions = {
            method: "POST",
            headers: {Authorization: "Bearer " + token}
        }
        await fetch(`http://localhost:8000/api/settings/sample-rate/${rate}`, requestOptions)
        setSr(rate)
    }

    return (
        <div style={{width: "250px", display: "flex", flexDirection: "row", alignItems: "center", alignContent: "space-between", flexWrap: "wrap"}}>
            <h2 style={{width: "125px"}}>Sample Rate: </h2>
            <select className={styles.filter} defaultValue={"default"} onChange={(e) => handleSR(e.target.value)}>
                <option value={"default"} disabled>{sr/1000} kHz</option>
                {sr === 16000 ? null : <option value={16000}>16 kHz</option>}
                {sr === 22000 ? null : <option value={22000}>22 kHz</option>}
                {sr === 44000 ? null : <option value={44000}>44 kHz</option>}
                {sr === 48000 ? null : <option value={48000}>48 kHz</option>}
                {sr === 96000 ? null : <option value={96000}>96 kHz</option>}
            </select>
        </div>
    )
}