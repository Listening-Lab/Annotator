//Tour.js
import React, { useEffect, useReducer } from "react";
import JoyRide, { ACTIONS, STATUS, EVENTS} from "react-joyride";

import { test_video } from '../utils/icons'

// Tour steps
const TOUR_STEPS = [
    {
        target: ".tour-start",
        content: <div>
            <p>
                Welcome to the Listening Lab Audio Annotation Tool. 
                This short tour will introduce the process for uploading, annotating and analysing audio files to identify vocalisations. 
                <br />&nbsp;<br />
                You can restart this tour from Settings {'>'} Restart Tour.
            </p>
        </div>,
        disableBeacon: true,
        hideCloseButton: true,
        placement: "center",
        disableOverlayClose: true,
    },
    // {
    //     target: ".tour-start",
    //     content: <div>
    //         <p>Alternatively, you can watch the demonstration video below for an introduction to annotating an audio file.</p>
    //         <video width='480px' height='360px' controls muted><source src={test_video}></source></video>
    //     </div>,
    //     disableBeacon: true,
    //     hideCloseButton: true,
    //     placement: "center",
    //     disableOverlayClose: true,
    //     styles: {tooltip: {
    //         width: '560px',
    //         height: 'auto',}
    //     }
    // },
    {
        target: ".tour-upload",
        content: <div>
            <p>
                If you want Listening Lab to automatically identfiy potential vocalisations, you must upload at least one reference
                audio file. These files must be a 1 second long clip of a known vocalisation. 
                <br />&nbsp;<br />
                Alternatively, you can use the default {'(possum)'} references by clicking 'Use Default'.
            </p>
        </div>,
        placement: "right",
        disableOverlayClose: true,
        spotlightClicks: true
    },
    {
        target: ".tour-playlist",
        content: "You can view your uploaded audio files here",
        placement: "right",
        disableOverlayClose: true,
        spotlightClicks: true
    },
    {
        target: ".tour-filter",
        content: "The filter menu allows you to sort the uploaded files based on their annotation status",
        placement: "right",
        disableOverlayClose: true,
        spotlightClicks: true
    },
    {
        target: ".tour-wave",
        content: "Audio files can be annotated as a whole waveform",
        disableOverlayClose: true,
        spotlightClicks: true
    },
    {
        target: ".tour-plot",
        content: "Point information here",
        disableOverlayClose: true,
        spotlightClicks: true
    },
    {
        target: ".tour-grid",
        content: "Or you can choose to view segments at a time in the grid view",
        disableOverlayClose: true,
        spotlightClicks: true
    },
    {
        target: ".tour-training",
        content: "Training information here",
        disableOverlayClose: true,
        spotlightClicks: true
    },
    {
        target: ".tour-settings",
        content: "Settings information here",
        disableOverlayClose: true,
        spotlightClicks: true
    },
    {
        target: ".tour-editor",
        content: "Visualisation information here",
        disableOverlayClose: true,
        spotlightClicks: true
    },
    {
        target: ".tour-link",
        content: "This is where you can start the tour again in future.",
        disableOverlayClose: true,
        spotlightClicks: true

    }
];

const tooltips = { back: '🡠', close: 'Close', last: '×', next: '🡢', open: 'Open the dialog', skip: 'Skip Tour' }

const INITIAL_STATE = {
    key: new Date(), // This field makes the tour to re-render when we restart the tour
    run: false,
    continuous: true, // Show next button
    loading: false,
    stepIndex: 0, // Make the component controlled
    steps: TOUR_STEPS
};

const reducer = (state = INITIAL_STATE, action) => {
    switch (action.type) {
        case "START":
            return { ...state, run: true };
            // Reset to 0th step
        case "RESET":
            return { ...state, stepIndex: 0 };
            // Stop the tour
        case "STOP":
            return { ...state, run: false };
            // Update the steps for next / back button click
        case "NEXT_OR_PREV":
            return { ...state, ...action.payload };
            // Restart the tour - reset go to 1st step, restart create new tour
        case "RESTART":
            return {
                ...state,
                stepIndex: 0,
                run: true,
                loading: false,
                key: new Date()
            };
        default:
            return state;
    }
}

// Tour component
export default function Tour({restart, setRestart}) {
    // Tour state is the state which control the JoyRide component
    const [tourState, dispatch] = useReducer(reducer, INITIAL_STATE);


    useEffect(() => {
        // Auto start the tour if the tour is not viewed before
        if (!localStorage.getItem("tour")) {
          dispatch({ type: "START" });
        }
    }, []);
    
      // Set once tour is viewed, skipped or closed
    const setTourViewed = () => {
        localStorage.setItem("tour", "1");
    };

    const callback = data => {
        const { action, index, type, status } = data;
    
        if (
            // If close button clicked then close the tour
            action === ACTIONS.CLOSE ||
            // If skipped or end tour, then close the tour
            (status === STATUS.SKIPPED && tourState.run) ||
            status === STATUS.FINISHED
        ) {
            setTourViewed()
            dispatch({ type: "STOP" });
        } else if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
            // Check whether next or back button click and update the step
            dispatch({
                type: "NEXT_OR_PREV",
                payload: { stepIndex: index + (action === ACTIONS.PREV ? -1 : 1) }
            });
        }

        document.onkeydown = function handleKeyEvents(e) {
            if (e.code === "KeyA" || e.code === "ArrowLeft") {
                dispatch({
                    type: "NEXT_OR_PREV",
                    payload: { stepIndex: index > 0 ? index - 1 : index}
                });
            }
            if (e.code === "KeyD" || e.code === "ArrowRight") {
                dispatch({
                    type: "NEXT_OR_PREV",
                    payload: { stepIndex: index + 1 }
                });
            }
        }
    };

    const startTour = () => {
        // Start the tour manually
        dispatch({ type: "RESTART" });
    };

    useEffect(() => {
        if (restart) {
            startTour()
            setRestart(false)
        }
    },[restart])
    
    return (
        <>
            <JoyRide
                {...tourState}
                callback={callback}
                steps={TOUR_STEPS}
                continuous={true}
                showProgress={false}
                showSkipButton={true}
                locale={tooltips}
                styles={{
                    options: {
                        arrowColor: '#ffffff',
                        backgroundColor: '#ffffff',
                        overlayColor: 'rgba(0, 0, 0, 0.5)',
                        primaryColor: 'rgba(103, 139, 255, 0.9)',
                        textColor: 'rgba(0,0,0,0.8)',
                        zIndex: 1000,
                    },
                    tooltip: {
                        width: '480px',
                        height: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                    },
                    tooltipContent: {
                        paddingTop: 25
                    },
                    beacon: {
                        boxShadow: 'none'
                    },
                    buttonBack: {
                        height: 30,
                        width: 30,
                        // margin: 50,
                        boxShadow: 'none'
                    },
                    buttonClose: {
                        display: 'none',
                        margin: 5,
                        boxShadow: 'none'
                    },
                    buttonSkip: {
                        height: 20,
                        boxShadow: 'none',
                        width: 100
                    },
                    buttonNext: {
                        height: 30,
                        width: 30,
                        boxShadow: 'none',
                        borderRadius: 15,
                    },
                }}
            />
        </>
    );
};