import './PageTitle.css'

/**
 * PageTitle — Large heading used on most pages.
 *
 * Usage:
 *   <PageTitle>GridFlex --</PageTitle>
 *   <PageTitle>About --</PageTitle>
 */
function PageTitle({ children }) {
  return (
    <h1 className="page-title">{children}</h1>
  )
}

export default PageTitle
