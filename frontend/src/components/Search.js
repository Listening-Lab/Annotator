// import React, { useState } from 'react'
// import { play_icon } from '../utils/icons'
// import './search.css'

// export default function SearchAudio({userID, token, search, audio}) {
//     const [limit, setLimit] = useState(8)

//     const addAudio = async (instance) => {

//         const requestOptions = {
//             method: "POST",
//             headers: {
//                 "accept": "application/json",
//                 "Authorization": "Bearer " + token,
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify({
//                 "filename": instance.filename,
//                 "status": 'Inprogress',
//                 "validation": false
//             })
//         }
//         await fetch(`/api/add/?owner_id=${instance.owner_id}`, requestOptions)
//     }

//     function filterByOwner(audio) {
//         // console.log(userID)
//         return audio.owner_id !== userID
//     }

//     return (

//         <div className='container' style={search ? {height: '100%'} : {height: '0%'}}>

//             <div className='audio_cards'>{audio.filter((audio) => filterByOwner(audio)).map((object, index) => 
//                 <>
//                 { (index < limit) ?
//                 <div className='card' key={`1_${index}`}>
//                     <span key={`2_${index}`} className='row'>
//                         <img key={`3_${index}`} className='spectrogram' src={`/api/cor/?user_id=${object.owner_id}&filename=${object.filename}`} alt=''></img>
//                     </span>
//                     <span key={`4_${index}`} className='row'>
//                         <button key={`5_${index}`} className='play'><img src={play_icon} alt=''></img></button>
//                         <button key={`6_${index}`} className='add' onClick={() => addAudio(object)}>+</button>
//                     </span>
//                 </div>
//                 : null}
//                 </>
//                 )}

//             </div>

//             <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '100px'}}>
//                 <button style={{width: '200px', fontSize: '16px'}} onClick={() => setLimit(limit+8)}>Show More</button>
//             </div>
//         </div>
//     )
// }