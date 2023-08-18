import React, { /*useContext, */useState, useEffect } from 'react'
// import { UserContext } from "../../context/UserContext"
import { settings_icon, listening_lab, grid_icon, wave_icon, training_icon } from '../../utils/icons'
import styles from './header.module.css'
import Training from './Training'
import Settings from './Settings' 

export default function Header({token, wavesurfer, grid, setGrid, gridFalse, setGridFalse, tag, setTag, search, setSearch, setEditRegion, classes, setClasses, setColours, restart, setRestart, settings, setSettings, training, setTraining}) {
    const [options, setOptions] = useState(['All'])
    // const [training, setTraining] = useState(false)
    // const [settings, setSettings] = useState(false)
    useEffect(() => {
        getTags()
    },[tag])

    useEffect(() => {
        if (!grid) {
            setGridFalse(!gridFalse)
        }
    },[grid])

    const refresh = () => window.location.reload(true)

    function handleLogout() {
        localStorage.setItem("token", null)
        document.onkeydown = null
        wavesurfer.current.destroy()
        refresh()
        
    }

    // Get list of avilable tags (user selects from drop down)
    const getTags = async () => {
        const requestOptions = {
            method: "GET",
            headers: {'Content-Type': 'application/json', Authorization: "Bearer " + token},
          }
    
          const response = await fetch('http://localhost:8000/api/settings/labels', requestOptions)
          if (response.ok) {
            const data = Object.keys(await response.json())
            data.unshift('All')
            setOptions(data)
          } else {
            console.log("something went wrong")
          }
        }

    const handleClick = async () => {
        setGrid(!grid)
        setEditRegion(null)
        setSearch(!search)
    }

    const settingsClick = () => {
        setSettings(!settings)
        setTraining(false)
    }

    const trainingClick = () => {
        setTraining(!training)
        setSettings(false)
    }

    return (
        <div className={styles.header}>
            <span style={{position: "absolute", width: "400px", left: "0px", margin: "20px", display: "flex", flexDirection: 'row'}}><h1 className={styles.name}>|</h1><h3 className={styles.version}>LISTENING LAB</h3></span>         

            <span className='search' style={search ? {width: "375px"} : {width: "auto"}}>
                {search ? 
                <select className='tags' onChange={e => setTag(e.target.value)}>
                    {options.map((label, index) => <option key={index}>{label}</option>)}
                </select> : null}
                <button className="search_icon" onClick={() => handleClick()}>
                    <img src={grid ? wave_icon : grid_icon} alt='change view' style={grid ? {width: "30px"} : {width: "25px"}} className="tour-grid"></img>
                </button>
            </span>

            {/* <button className={styles.menu} onFocus={() => setRefresh(true)} onBlur={() => setRefresh(false)}><img className={styles.img} src={stats_icon} alt='profile'></img><User/></button> */}
            <div className={styles.menu}><img className='tour-training' src={training_icon} alt='training' onClick={() => trainingClick()}></img>
                <div className={styles.console} style={!training ? {display: "none"} : {display: "block"}}>
                    < Training />
                </div>
            </div>
            <div className={styles.menu}><img className='tour-settings' src={settings_icon} alt='settings' onClick={() => settingsClick()}></img>
                <div className={styles.console} style={!settings ? {display: "none"} : {display: "block"}}>
                    < Settings wavesurfer={wavesurfer} classes={classes} setClasses={setClasses} setColours={setColours} restart={restart} setRestart={setRestart}/>
                </div>
            </div>
            <button className={styles.logout} onClick={() => handleLogout()}>Logout</button>
            <img src={listening_lab} style={{width: "40px", margin: "20px"}} alt='logo'></img>
        </div>
    )
}