import React from 'react'

export default function Overlay({start, end, duration}) {
    // Extend default wavesurfer region over spectrogram
    
    return (
        <div style={{overflow: 'none', 
                     pointerEvents: 'none', 
                     position: 'relative', 
                     backgroundColor: 'rgba(255, 255, 255, 0.3)', 
                     zIndex: '5', 
                     left: `${100*(start/duration)}%`, 
                     width: `${100*((end-start)/duration)}%`, 
                     height: '400px', top: '-400px'}}>
         </div>
    )
}