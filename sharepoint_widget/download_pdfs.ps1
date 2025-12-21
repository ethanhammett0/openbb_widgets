$pdfs = @{
    "RE_Offering_Memo_Sample.pdf" = "https://images.bizbuysell.com/shared/listings/166/1664473/20d3f3fc-f6f5-43e0-b1e6-7d04e5fe947d.pdf";
    "FannieMae_Credit_Risk_Deal.pdf" = "https://capitalmarkets.fanniemae.com/resources/file/credit-risk/pdf/connave-2019-r05-offering-memorandum.pdf";
    "Commercial_Lease_Agreement.pdf" = "http://cdcloans.com/pdf/commercial_lease_for_epc.pdf";
    "Bond_Prospectus_Housing_Fund.pdf" = "https://www.sec.gov/Archives/edgar/data/1925986/000192598622000010/bondprospectusamend.pdf";
    "Infrastructure_Loan_Term_Sheet.pdf" = "https://www.hkma.gov.hk/media/eng/doc/key-functions/ifc/iffo/reference-term-sheet-for-infrastructure-loans_iffo_v9_clean.pdf";
    "FreddieMac_Asset_Summary.pdf" = "https://mf.freddiemac.com/docs/sample_asset_summary_report_SBL.pdf"
}

$destDir = "c:\Users\ehamm\OneDrive\Desktop\Python Directory\openbb_widgets\sharepoint_widget\dummy_pdf"

foreach ($name in $pdfs.Keys) {
    $url = $pdfs[$name]
    $filepath = Join-Path $destDir $name
    Write-Host "Downloading $name from $url..."
    try {
        Invoke-WebRequest -Uri $url -OutFile $filepath
        Write-Host "Successfully downloaded $name"
    } catch {
        Write-Error "Failed to download $name : $_"
    }
}
