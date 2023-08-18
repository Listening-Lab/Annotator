import React, { useEffect } from 'react'
import styles from './label.module.css'


export default function EditLabels({label, setLabel, token, edit, setEdit, classes, setClasses, x, y, setColours}) {

    useEffect(() => {
      getClasses()
    },[label])

    const getClasses = async () => {
      const requestOptions = {
        method: "GET",
        headers: {'Content-Type': 'application/json', Authorization: "Bearer " + token},
      }

      const response = await fetch('http://localhost:8000/api/settings/labels', requestOptions)
      if (response.ok) {
        const data = await response.json()
        setClasses([])
        setColours(data)
        for (const item of Object.keys(data)) {
          setClasses(classes => [...classes, {label: item,
                                              colour: data[item]}])
        }
      } else {
        console.log("something went wrong")
      }
    }

    const handleLabel = async (e) => {
      e.preventDefault()
      e.stopPropagation()
      setLabel(e.target.value)
      console.log(e.target.value)
      setEdit(false)
    }

  return (
    <div>
      { edit ? <footer className={styles.labelEditor} style={{'top':`${y-10}px`, 'left':`${x-50}px`}}>
        <select className={styles.labelSelector} value={label} onChange={(e) => handleLabel(e)}>
          {classes.map((opt,index) => <option key={index}>{opt.label}</option>)}
        </select>
      </footer> : <></> }
    </div>
  )
}