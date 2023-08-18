import React from 'react'
import styles from './header.module.css'
import {cacophony_logo, pf2050_logo, canterbury_logo} from '../../utils/icons'

export default function Manual() {
    return (
        <div className={styles.info}>
            <h2>Uploading new files</h2>
            <p>Select and upload file(s) using the uploader below the playlist.
                Ensure that audio is in .wav format. 
                Files will automatically be denoised, segmented and annotated 
                when uploaded. This may take up to 30 seconds for 5 minute 
                field recordings.
                Files will automatically appear in the side panel once uploaded.
                If files don't appear, check that the date filter includes a relevant
                range and the status filter is set to 'All' or 'Incomplete'.
            </p>
            <h2>Annotating recordings</h2>
            <p>Select a file from the side panel. A waveform and spectrogram will appear,
                give it a few seconds for longer recordings. 
                The waveform will include automatically generated regions which can be adjusted.
                Click and drag region to move, click and drag edges to adjust onset/offset times,
                click and select label from drop down to adjust label. Delete region using 'ctrl + click'
                Add new regions by click and dragging on the waveform or clicking '+' button.
                Edited regions and labels are automatically saved.
            </p>
            <h2>Exporting Annotation</h2>
            <p>Select settings to access the export panel. Specify the date range you would like to export
                and click 'export'. A json file containing filename, start, end and labels will automatically download.
                Only files marked as complete will be exported, you can change the file status on the audio side panel.
            </p>
            <h2>User Info</h2>
            <p>Select user icon to access related statisitics</p>
            <hr></hr>

            <h2>Collaborators</h2>
            <div className={styles.row}>
                <img className={styles.logos} src={cacophony_logo} alt='Cacophony Logo'></img>
                <img className={styles.logos} src={pf2050_logo} alt='PF2050 Logo'></img>
                <img className={styles.logos} src={canterbury_logo} alt='Canterbury Logo'></img>
            </div>
        </div>
    )
}
