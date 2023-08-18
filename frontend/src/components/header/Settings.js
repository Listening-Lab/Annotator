import React, { useContext } from 'react'
import styles from './header.module.css'
import { UserContext } from "../../context/UserContext"
import Editor from './Editor'
import Resample  from './Resample'
export default function Settings({wavesurfer, classes, setClasses, setColours, restart, setRestart}) {
    const [token, setToken] = useContext(UserContext)

    const handleDeleteAccount = async () => {
        var confirmation = window.confirm("Are you sure you want to delete your account")
        if (confirmation) {
            const requestOptions = {
                method: "DELETE",
                headers: {Authorization: "Bearer " + token}
            }
            const response = await fetch('http://localhost:8000/api/user/delete_account', requestOptions)
            if (response.ok) {
                console.log("Account Deleted")
                setToken(null)
                localStorage.setItem("token", null)
                document.onkeydown = null
                wavesurfer.current.destroy()
            } else {
                console.log("Something went wrong")
            }
        }
    }

    const handleExport = async () => {
        const requestOptions = {
            method: "GET",
            headers: {Authorization: "Bearer " + token}
        }
        const response = await fetch('http://localhost:8000/api/export_annotations', requestOptions)
        if (response.ok) {
            console.log("Annotations exported to static")
        }
    }

    const handleRestartTour = async () => {
        setRestart(!restart)
    }

    return (
        <div className={styles.info}>            
            <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
                <hr></hr>
                <Editor classes={classes} setClasses={setClasses} setColours={setColours}/>
                <hr></hr>
                <Resample/>
                <hr></hr>
                <div className="tour-link"><button className={styles.delete} onClick={() => handleRestartTour()}>Restart Tour</button></div>
                <hr></hr>
                <div className="tour-export"><button className={styles.delete} onClick={() => handleExport()}>Export Annotations</button></div>
                <hr></hr>
                <button className={styles.delete} onClick={() => handleDeleteAccount()}>Delete Account</button>   
            </div> 
        </div>
    )
}