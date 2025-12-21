$pdfs = @{
    "RE_Offering_Memo_Sample.pdf" = "https://images.bizbuysell.com/shared/listings/166/1664473/20d3f3fc-f6f5-43e0-b1e6-7d04e5fe947d.pdf";
    "FannieMae_Credit_Risk_Deal.pdf" = "https://capitalmarkets.fanniemae.com/resources/file/credit-risk/pdf/connave-2019-r05-offering-memorandum.pdf";
    "Commercial_Lease_Agreement.pdf" = "http://cdcloans.com/pdf/commercial_lease_for_epc.pdf";
    "Bond_Prospectus_Housing_Fund.pdf" = "https://www.sec.gov/Archives/edgar/data/1925986/000192598622000010/bondprospectusamend.pdf";
}

$baseDir = "c:\Users\ehamm\OneDrive\Desktop\Python Directory\openbb_widgets\sharepoint_widget\dummy_pdf"
$mappings = @{
    "RE_Offering_Memo_Sample.pdf" = "Financials";
    "FannieMae_Credit_Risk_Deal.pdf" = "Financials";
    "Commercial_Lease_Agreement.pdf" = "Legal";
    "Bond_Prospectus_Housing_Fund.pdf" = "Legal";
}

foreach ($name in $pdfs.Keys) {
    if ($mappings.ContainsKey($name)) {
        $folder = $mappings[$name]
        $destDir = Join-Path $baseDir $folder
        if (!(Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir | Out-Null }
        
        $url = $pdfs[$name]
        $filepath = Join-Path $destDir $name
        
        Write-Host "Downloading $name to $folder..."
        try {
            Invoke-WebRequest -Uri $url -OutFile $filepath
            Write-Host "Success."
        } catch {
            Write-Error "Failed: $_"
        }
    }
}
