# Copy popup from coiffure to premium
$coiffure = Get-Content "app\photobooth-coiffure\[slug]\cam\page.js" -Encoding UTF8 | Out-String
$premium = Get-Content "app\photobooth-premium\[slug]\cam\page.js" -Encoding UTF8 | Out-String

# Find the popup start and end in coiffure (lines 2475-3175)
$popupStart = "      {/* Processing Overlay Web 3.0 */"
$popupEnd = "      </AnimatePresence>"

# Extract popup from coiffure
$coiffureLines = $coiffure -split "`n"
$startIndex = -1
$endIndex = -1

for ($i = 0; $i -lt $coiffureLines.Count; $i++) {
    if ($coiffureLines[$i].Trim() -eq "{/* Processing Overlay Web 3.0 */}") {
        $startIndex = $i
    }
    if ($startIndex -ge 0 -and $coiffureLines[$i].Trim() -eq "</AnimatePresence>") {
        $endIndex = $i
        break
    }
}

if ($startIndex -ge 0 -and $endIndex -ge 0) {
    Write-Host "Found popup from line $startIndex to $endIndex"
    
    # Extract the popup
    $popupContent = $coiffureLines[$startIndex..$endIndex] -join "`n"
    
    # Replace photobooth-coiffure with photobooth-premium in the URL
    $popupContent = $popupContent -replace "photobooth-coiffure", "photobooth-premium"
    
    Write-Host "Popup extracted and modified"
    Write-Host "Popup length: $($popupContent.Length) characters"
    
    # Save to temp file for inspection
    $popupContent | Out-File "popup-content.txt" -Encoding UTF8
    Write-Host "Saved to popup-content.txt"
} else {
    Write-Host "Could not find popup boundaries"
    Write-Host "Start index: $startIndex"
    Write-Host "End index: $endIndex"
}
