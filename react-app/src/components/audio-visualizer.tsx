import React, { useEffect } from 'react';

const AudioVisualizer = ({audioStream}: {audioStream: MediaStream}) => {
    const backgroundColor = '#F5FCFF';
    const lineColor = '#4F7787';

    let canvasEl: HTMLCanvasElement;
    let canvasContext: any;
    let currentAnimationFrame: any;
    let hasStarted: boolean = false;
    let audioContext: any  = null;


    useEffect(() => {
        const canvas = document.getElementById('audioVisualizer') as HTMLCanvasElement;
        canvasEl = canvas;
        canvasContext = canvas.getContext('2d');

        if (audioStream && !hasStarted) {
            resetVisualization();
        }

        return function cleanup() {
            _cleanupAnalyzer();
        }
    }, [audioStream]);

    useEffect(() => {
        resetVisualization();
    }, [audioStream])

    const _cleanupAnalyzer = () => {
        if (audioContext) {
            audioContext.close();

        }

        if (currentAnimationFrame) {
            cancelAnimationFrame(currentAnimationFrame);
            currentAnimationFrame = null;
        }
    }

    const resetVisualization = () => {
        hasStarted = true;
        _cleanupAnalyzer();
        if (audioStream) {
            _visualizeAudio(audioStream);
        }
    }

    const _visualizeAudio = (stream) => {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const windowAudioContext = new AudioContext();
        audioContext = windowAudioContext;
        const analyzer = windowAudioContext.createAnalyser();
        analyzer.minDecibels = -90;
        analyzer.maxDecibels = -10;
        analyzer.smoothingTimeConstant = 0.65;

        const source = windowAudioContext.createMediaStreamSource(stream);
        source.connect(analyzer);

        const bufferLength = analyzer.fftSize = 2048;
        const dataArray = new Uint8Array(bufferLength);

        canvasContext.clearRect(0, 0, canvasEl.width, canvasEl.height);
        const draw = () => {
            currentAnimationFrame = requestAnimationFrame(draw);

            analyzer.getByteTimeDomainData(dataArray);

            canvasContext.fillStyle = backgroundColor;
            canvasContext.fillRect(0, 0, canvasEl.width, canvasEl.height);

            canvasContext.lineWidth = 1;
            canvasContext.strokeStyle = lineColor;
            canvasContext.beginPath();

            const sliceWidth = canvasEl.width / bufferLength;
            let x = 0;
            for(let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = v * canvasEl.height / 2;

                if (i === 0) {
                    canvasContext.moveTo(x, y);
                } else {
                    canvasContext.lineTo(x, y);
                }
                x += sliceWidth;
            }

            canvasContext.lineTo(canvasEl.width, canvasEl.height / 2);
            canvasContext.stroke();
        }

        draw();
    }

    return (
        <canvas id="audioVisualizer"></canvas>
    )
}

export default AudioVisualizer;