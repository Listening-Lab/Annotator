import React, {useState, useContext, useEffect, useRef} from 'react'
import { UserContext } from "../../context/UserContext"

import Wave from "./Wave"
// import { search_icon } from '../../utils/icons'
import './view.css'

export default function GridView({grid, setGrid, setAudio, handlePointClick, tag, search, setSearch, setColours}) {
    const ref = useRef(false)
    const [playlist, setPlaylist] = useState([])
    const [token,] = useContext(UserContext)
    const [limit, setLimit] = useState(12)
    // const [options, setOptions] = useState([])
    const [deleted, setDeleted] = useState(false)
    const [refresh, setRefresh] = useState(false)
    const [done, setDone] = useState(false)
    // const [search, setSearch] = useState(false)

    useEffect(() => {
        setRefresh(!refresh)
        console.log("playlist updated")
    },[done])

    useEffect(() => {
        if (ref.current) {
            const getPlaylist = async () => {
                const requestOptions = {
                method: "GET",
                headers: {Authorization: "Bearer " + token}
                }
                const response = await fetch(`http://localhost:8000/api/segs`, requestOptions)
                
                if (response.ok) {
                    const data = await response.json()
                    setPlaylist(() => [])
                    for (const file of data){
                        setPlaylist(playlist => [...playlist, file])
                    }
                    if (playlist.length > 0) {
                        setDone(!done)
                    } else {
                        console.log("nothing to clear")
                    }
                } else {
                    console.log(response)
                }
            }
            getPlaylist()
            // getTags()
        }
    },[tag, deleted])

    // This is now depreciated if this needs to be re-enabled. use getClasses instead
    // Get list of avilable tags (user selects from drop down)
    // const getTags = async () => {
    //     const requestOptions = {
    //         method: "GET",
    //         headers: {
    //             "accept": "application/json",
    //         },
    //     }
    //     const response = await fetch("http://localhost:8000/api/tags", requestOptions)
    //     const data = await response.json()
    //     setOptions(data)
    // }

    const handleClick = async () => {
        setLimit(() => limit + 8)
    }

    const filterbyLabel = (audio) => {
        return tag === 'All' || audio.label === tag
    }



    return (
        <div className="cards_container">
            <div className="wavesurfer_cards" style={!grid ? {display:'none'} : null} ref={ref}>
                {(playlist.length === 0) ? <div><h3>Upload Audio to View</h3></div> : 
                playlist.filter((audio) => filterbyLabel(audio)).map((audio,index) => <div key={`${index}`}>{(index < limit) ? <Wave index={index} audio={audio} setGrid={setGrid} setAudio={setAudio} handlePointClick={handlePointClick} search={search} setSearch={setSearch} deleted={deleted} setDeleted={setDeleted} refresh={refresh} setColours={setColours}/> : null}</div>) }
            </div>
            
            {(playlist.length !== 0) ? 
            <div className='button_container'>
                <button className="more" onClick={() => handleClick()}>Show More</button> 
            </div> : null}
        </div>
    )
}