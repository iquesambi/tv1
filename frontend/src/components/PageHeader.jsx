import MobileMenu from './MobileMenu.jsx'
import './PageHeader.css'

export default function PageHeader({ logoUrl, label, onLogoClick, mobileMenuLogo }) {
  return (
    <header className="page-header">
      <button className="page-header__logo" onClick={onLogoClick} aria-label="Home">
        {logoUrl && <img src={logoUrl} alt="TV1" />}
      </button>
      <span className="page-header__titulo">{label}</span>
      {mobileMenuLogo && <MobileMenu logo={mobileMenuLogo} logoFiltro="brightness(0)" />}
    </header>
  )
}
