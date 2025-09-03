import './App.css'
import {BrowserRouter, Routes, Route} from 'react-router-dom'
import Chat from './pages/ChatRoom'
import Home from './pages/HomePage'
import NotFound from './pages/NotFound'
import Register from './pages/Register'
import { Toaster } from 'react-hot-toast'

function App() {

  return (
    <>
    <div className='bg-gray-900 h-full w-full min-h-screen min-w-screen'>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#000',
            color: '#fff',
          },
        }}
      />
      <BrowserRouter>   
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chat/:roomId" element={<Chat />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </div>
    </>
  )
}

export default App
