$destDir = "c:\Users\ehamm\OneDrive\Desktop\Python Directory\openbb_widgets\sharepoint_widget\dummy_pdf\real_estate"
if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir }

$files = @(
    @{
        Url  = "https://assets.ctfassets.net/76yofid2j35k/6QO8q8o0Z9I9fX0Y5zL4S/bd4e6e6e8e8e8e8e8e8e8e8e8e8e8e8e/Parker_MOB_Investment_Analysis.pdf"
        Name = "Parker_MOB_Investment_Analysis.pdf"
    },
    @{
        Url  = "https://www.cbre.com/-/media/project/cbre/shared-site/insights/reports/2025-healthcare-real-estate-outlook/2025-us-healthcare-real-estate-outlook.pdf"
        Name = "CBRE_2025_Healthcare_RE_Outlook.pdf"
    },
    @{
        Url  = "https://www.jll.com/content/dam/jll-com/documents/pdf/research/americas/us/jll-us-healthcare-real-estate-outlook-2024.pdf"
        Name = "JLL_Healthcare_RE_Outlook_2024.pdf"
    }
)

foreach ($file in $files) {
    $destFile = Join-Path $destDir $file.Name
    Write-Host "Downloading $($file.Name)..."
    try {
        Invoke-WebRequest -Uri $file.Url -OutFile $destFile -ErrorAction Stop
        Write-Host "Successfully downloaded $($file.Name)"
    }
    catch {
        Write-Host "Failed to download $($file.Name): $_"
    }
}
