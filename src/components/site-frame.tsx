'use client'

import type { ReactNode } from 'react'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type SiteFrameProps = {
  children: ReactNode
}

export function SiteFrame({ children }: SiteFrameProps) {
  const pathname = usePathname()
  const isHomePage = pathname === '/'

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <div id="page-top"></div>

      <header className={`header ${isHomePage ? 'header-home' : 'header-subpage'}`}>
        <div className="header-content">
          <nav className="header-inline-nav header-inline-nav-left" aria-label="Ana navigasyon">
            <Link href="/" className="header-inline-item">
              Kaş Guide
            </Link>
            <span className="header-inline-separator" aria-hidden="true"></span>
            <Link href="/#categories" className="header-inline-item">
              Kategoriler
            </Link>
            <span className="header-inline-separator" aria-hidden="true"></span>
            <Link href="/#contact" className="header-inline-item">
              İletişim
            </Link>
          </nav>

          <nav className="header-inline-nav header-inline-nav-right" aria-label="Kısa yol">
            <Link href="/" className="header-inline-item">
              Ana Sayfa
            </Link>
          </nav>
        </div>
      </header>

      <div className={`page-shell ${isHomePage ? 'page-shell-home' : 'page-shell-subpage'}`}>
        {children}
      </div>

      <button
        type="button"
        className="back-to-top"
        aria-label="Yukarı çık"
        onClick={scrollToTop}
      >
        <span className="back-to-top-image" aria-hidden="true"></span>
      </button>
    </>
  )
}
