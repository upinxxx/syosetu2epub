# PowerShell script to fix repository references
# 這個腳本會找出所有引用舊 Repository 接口或 TOKEN 的文件，並替換為新的引用路徑

Write-Host "開始修正 Repository 引用..."

# 1. 替換從 repositories.module.js 引入的 TOKEN
$files = Get-ChildItem -Path .\src -Recurse -Filter *.ts | 
    Where-Object { 
        (Get-Content $_.FullName -Raw) -match "import.*_REPOSITORY_TOKEN.*from.*repositories\.module\.js" 
    }

Write-Host "找到 $($files.Count) 個文件需要修復 TOKEN 引用"

foreach ($file in $files) {
    Write-Host "修復文件: $($file.FullName)"
    
    # 備份文件
    Copy-Item $file.FullName "$($file.FullName).bak"
    
    # 替換引用
    (Get-Content $file.FullName) | 
        ForEach-Object {
            $_ -replace 'import \{ (.*_REPOSITORY_TOKEN.*) \} from .*/infrastructure/repositories/repositories\.module\.js.;', 'import { $1 } from ''@/domain/ports/repository/index.js'';'
        } | Set-Content $file.FullName
}

# 2. 替換從 repository.port.js 引入的 Repository 接口
$files = Get-ChildItem -Path .\src -Recurse -Filter *.ts | 
    Where-Object { 
        (Get-Content $_.FullName -Raw) -match "import.*Repository.*from.*repository\.port\.js" 
    }

Write-Host "找到 $($files.Count) 個文件需要修復 Repository 接口引用"

foreach ($file in $files) {
    Write-Host "修復文件: $($file.FullName)"
    
    # 備份文件
    Copy-Item $file.FullName "$($file.FullName).bak"
    
    # 替換引用
    (Get-Content $file.FullName) | 
        ForEach-Object {
            # 替換 Repository<T> 為具體的 Repository 接口
            if ($_ -match "import \{ (.*Repository.*) \} from .*/domain/ports/repository\.port\.js.;") {
                $_ -replace 'import \{ (.*Repository.*) \} from .*/domain/ports/repository\.port\.js.;', 'import { $1 } from ''@/domain/ports/repository/index.js'';'
            }
            # 替換 Repository<SomeEntity> 為 SomeEntityRepository
            elseif ($_ -match "Repository<(.*?)>") {
                $entity = $Matches[1]
                if ($entity -eq "User") {
                    $_ -replace "Repository<User>", "UserRepository"
                }
                elseif ($entity -eq "Novel") {
                    $_ -replace "Repository<Novel>", "NovelRepository"
                }
                elseif ($entity -eq "EpubJob") {
                    $_ -replace "Repository<EpubJob>", "EpubJobRepository"
                }
                elseif ($entity -eq "KindleDelivery") {
                    $_ -replace "Repository<KindleDelivery>", "KindleDeliveryRepository"
                }
                else {
                    $_
                }
            }
            else {
                $_
            }
        } | Set-Content $file.FullName
}

Write-Host "修復完成!" 