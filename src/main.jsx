import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import KnapsackInput from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* <App /> */}
    <KnapsackInput />
  </StrictMode>,
)
