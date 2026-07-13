source "https://rubygems.org"

# Deployed via the GitHub Actions workflow in .github/workflows/pages.yml,
# not the legacy "github-pages" gem — so we're free to use current Jekyll
# and any plugin on rubygems.org instead of GitHub's older, whitelisted
# build environment.
gem "jekyll", "~> 4.3"

group :jekyll_plugins do
  gem "jekyll-feed", "~> 0.17"
  gem "jekyll-seo-tag", "~> 2.8"
end

# Ruby 3.0+ no longer bundles these by default; Jekyll needs them.
gem "webrick", "~> 1.8"
gem "csv"
gem "base64"
gem "logger"

platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", ">= 1", "< 3"
  gem "tzinfo-data"
end

gem "wdm", "~> 0.1", :platforms => [:mingw, :x64_mingw, :mswin]
