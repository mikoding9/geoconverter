import { useState, useEffect } from 'react'
import { initCppJs, Native } from './native/native.h'

function App() {
  const [message, setMessage] = useState('Initializing...')

  useEffect(() => {
    initCppJs().then(() => {
      setMessage(Native.getGdalInfo());
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <p className="text-5xl md:text-6xl font-light text-gray-100 tracking-tight">
          {message}
        </p>
      </div>
    </div>
  )
}

export default App
