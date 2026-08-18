import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * MarqueeText - 文本溢出省略 + hover 滚动显示完整内容
 *
 * 空闲时 CSS 省略号（…），鼠标悬停且内容溢出时平滑滚动到完整末尾。
 * 外层 span 需由调用方传入块级化 class（flex 容器内用 flex-1，块级容器用 block w-full），
 * 否则 text-overflow 省略号不生效。
 */

interface MarqueeTextProps {
  children: ReactNode
  className?: string
  title?: string
}

export function MarqueeText({ children, className = '', title }: MarqueeTextProps) {
  const outerRef = useRef<HTMLSpanElement>(null)
  const innerRef = useRef<HTMLSpanElement>(null)
  const [hover, setHover] = useState(false)
  const [marquee, setMarquee] = useState({ dist: 0, duration: 0 })

  useEffect(() => {
    const outer = outerRef.current
    if (!outer) return
    const measure = () => {
      const dist = Math.max(0, outer.scrollWidth - outer.clientWidth)
      setMarquee(
        dist > 0
          ? { dist, duration: Math.max(0.3, Math.min(4, dist / 40)) }
          : { dist: 0, duration: 0 },
      )
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(outer)
    return () => ro.disconnect()
  }, [children])

  return (
    <span
      ref={outerRef}
      className={`truncate min-w-0 ${className}`}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span
        ref={innerRef}
        className={hover && marquee.dist > 0 ? 'inline-block whitespace-nowrap' : ''}
        style={{
          transform: hover && marquee.dist > 0 ? `translateX(${-marquee.dist}px)` : 'translateX(0)',
          transition: `transform ${marquee.duration}s ease`,
        }}
      >
        {children}
      </span>
    </span>
  )
}