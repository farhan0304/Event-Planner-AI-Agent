import * as cheerio from 'cheerio';
// import fs from 'fs';


function extractMovieDetails(htmlContent) {
  const $ = cheerio.load(htmlContent);
  
  const jsonLdScripts = $('script[type="application/ld+json"]');
  
  let movieInfo = {};
  const screeningEvents = [];

  jsonLdScripts.each((_, element) => {
    try {
      const data = JSON.parse($(element).html());

      // Parse Movie metadata
      if (data['@type'] === 'Movie') {
        movieInfo = {
          title: data.name,
          description: data.description,
          duration: data.duration,
          genre: data.genre,
          contentRating: data.contentRating,
          languages: data.inLanguage,
          director: data.director?.map(d => d.name) || [],
          releaseDate: data.datePublished
        };
      }

      // Parse individual Screening Events (Venue, Date, Time, Price, Format)
      if (data['@type'] === 'ScreeningEvent') {
        screeningEvents.push({
          movieTitle: data.workPresented?.name || data.name,
          format: data.videoFormat,
          startTime: data.startDate, // ISO String (e.g., 2026-07-30T07:15:00+05:30)
          endTime: data.endDate,
          venue: {
            name: data.location?.name,
            address: data.location?.address?.streetAddress,
            locality: data.location?.address?.addressLocality,
            country: data.location?.address?.addressCountry,
            coordinates: data.location?.geo
          },
          offer: {
            price: data.offers?.price,
            currency: data.offers?.priceCurrency,
            availability: data.offers?.availability
          }
        });
      }
    } catch (e) {
        console.error("Failed to parse JSON-LD script", e);
    }
  });

  // 2. Fallback to extracting Next.js inline state if schema tags are missing
  if (screeningEvents.length === 0) {
    const nextDataScript = $('#__NEXT_DATA__').html();
    if (nextDataScript) {
      try {
        const nextData = JSON.parse(nextDataScript);
        const pageData = nextData?.props?.pageProps?.pageData;
        
        if (pageData?.nearbyCinemas) {
          pageData.nearbyCinemas.forEach(cinema => {
            const venueName = cinema.cinemaInfo?.name;
            const venueAddress = cinema.cinemaInfo?.address;
            
            cinema.sessions?.forEach(session => {
              screeningEvents.push({
                movieTitle: movieInfo.title || "Unknown",
                format: session.scrnFmt,
                startTime: session.showTime,
                venue: {
                  name: venueName,
                  address: venueAddress
                },
                offer: {
                  price: session.areas?.[0]?.price || null,
                  currency: "INR"
                }
              });
            });
          });
        }
      } catch (e) {
        console.error("Failed to parse __NEXT_DATA__ fallback", e);
      }
    }
  }

  return {
    movie: movieInfo,
    screeningsCount: screeningEvents.length,
    screenings: screeningEvents
  };
}

function extractDetailedMovieUrl(htmlContent) {
  const $ = cheerio.load(htmlContent);
  
  
  const rawHref = $('a[href*="district.in"]').first().attr('href');
  
  if (!rawHref) {
    return null;
  }

  
  if (rawHref.startsWith('/url?')) {
    const urlParams = new URLSearchParams(rawHref.replace('/url?', ''));
    return urlParams.get('q') || urlParams.get('url') || rawHref;
  }

  return rawHref;
}

function extractUniversalGoogleResults(htmlString) {
    const $ = cheerio.load(htmlString);

    const data = {
        knowledgePanel: null,
        organicResults: [],
        peopleAlsoAsk: [],
        relatedSearches: []
    };

    const $kp = $('#rhs, .kp-wholepage-osrp');
    if ($kp.length) {
        const title = $kp.find('[data-attrid="title"], h2 span').first().text().trim();
        const subtitle = $kp.find('[data-attrid="subtitle"]').text().trim();
        const description = $kp.find('.kno-rdesc span').first().text().trim();

        if (title) {
            data.knowledgePanel = {
                title,
                subtitle,
                description
            };
        }
    }

    $('div.g, div.yuRUbf').each((_, element) => {
        const $item = $(element);
        
      
        const $link = $item.find('a').first();
        const title = $item.find('h3').first().text().trim();
        const url = $link.attr('href');

       
        const $parentContainer = $item.closest('.N54PNb, .MjjYud, .g');
        const snippet = $parentContainer.find('.VwiC3b, .IsZvec').text().trim();

        if (title && url && url.startsWith('http')) {
            data.organicResults.push({ title, url, snippet });
        }
    });

    $('.related-question-pair, [data-q]').each((_, el) => {
        const question = $(el).find('.WaSpec, [role="button"] span').first().text().trim();
        if (question && !data.peopleAlsoAsk.includes(question)) {
            data.peopleAlsoAsk.push(question);
        }
    });

    $('.s75Sp, .dg6jd, a[href*="/search?"]').each((_, el) => {
        const query = $(el).text().trim();
        const isRelatedSection = $(el).closest('#bres, .oIk2Cb').length > 0;
        
        if (isRelatedSection && query && !data.relatedSearches.includes(query)) {
            data.relatedSearches.push(query);
        }
    });
    
    return data;
}

export {
    extractMovieDetails,
    extractDetailedMovieUrl,
    extractUniversalGoogleResults,
}

// // for debugging and testing the extraction function
// const htmlData = fs.readFileSync('districtOdyssey.html', 'utf8');
// const result = extractMovieDetails(htmlData);

// const structuredData = JSON.stringify(result, null, 2);
// console.log(structuredData);
// console.log(structuredData.length)
