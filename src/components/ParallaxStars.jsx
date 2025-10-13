import { useEffect, useRef } from 'react'
import './ParallaxStars.css'

// Generate random star positions
const generateStars = (count) => {
  const stars = []
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * 2000,
      y: Math.random() * 2000
    })
  }
  return stars
}

// Create box-shadow string from star positions
const createBoxShadow = (stars) => {
  return stars.map(star => `${star.x}px ${star.y}px #FFF`).join(', ')
}

export function ParallaxStars() {
  const starsRef = useRef(null)
  const stars2Ref = useRef(null)
  const stars3Ref = useRef(null)

  useEffect(() => {
    // Generate stars on mount - reduced for subtlety
    const smallStars = generateStars(100)
    const mediumStars = generateStars(30)
    const bigStars = generateStars(20)

    if (starsRef.current) {
      starsRef.current.style.boxShadow = createBoxShadow(smallStars)
    }
    if (stars2Ref.current) {
      stars2Ref.current.style.boxShadow = createBoxShadow(mediumStars)
    }
    if (stars3Ref.current) {
      stars3Ref.current.style.boxShadow = createBoxShadow(bigStars)
    }
  }, [])

  return (
    <div className="parallax-stars-container">
      <div id="stars" ref={starsRef}></div>
      <div id="stars2" ref={stars2Ref}></div>
      <div id="stars3" ref={stars3Ref}></div>
    </div>
  )
}
