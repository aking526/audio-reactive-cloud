import { useState } from 'react'
import AudioUploader from './components/AudioUploader'
import AudioPlayer from './components/AudioPlayer'

function App() {
  const [audioFile, setAudioFile] = useState<File | null>(null)

  const handleAudioLoaded = (_buffer: unknown, file: File) => {
    setAudioFile(file)
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {!audioFile && (
          <header className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Audio Processing Studio</h1>
            <p className="text-lg text-gray-600">Upload, play, and modify audio with ease</p>
          </header>
        )}
        
        <main className="space-y-8">
          {!audioFile && (
            <AudioUploader onAudioLoaded={handleAudioLoaded} />
          )}
          
          {audioFile && (
            <div className="space-y-8">
              <AudioPlayer audioFile={audioFile} />
              
              <div className="flex justify-center">
                <button
                  onClick={() => setAudioFile(null)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Upload a different audio file
                </button>
              </div>
            </div>
          )}
        </main>
        
        {!audioFile && (
          <footer className="mt-16 text-center text-gray-500 text-sm">
            <p>Built with React, Tone.js and WaveSurfer.js</p>
          </footer>
        )}
      </div>
    </div>
  )
}

export default App
