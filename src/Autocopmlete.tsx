import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import useDebounce from './hooks/useDebounce'
import useOnClickOutside from './hooks/useClickOutside'
import Loader from './components/Loader'

type Place = {
	id: string
	place_name: string
	geometry: {
		coordinates: [number, number]
	}
	properties: {
		[key: string]: string | boolean | undefined
	}
}

const Autocomplete: React.FC = () => {
	const [query, setQuery] = useState('')
	const [places, setPlaces] = useState<Place[]>([])
	const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)
	const [isLoading, setIsLoading] = useState(false)
	const [activeIndex, setActiveIndex] = useState(-1)
	const [showList, setShowList] = useState(false)
	const [allowFetch, setAllowFetch] = useState(true)
	const listRef = useRef<HTMLUListElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)

	const debouncedQuery = useDebounce(query, 500)

	const MAPBOX_GEOCODING_API_URL =
		'https://api.mapbox.com/geocoding/v5/mapbox.places'
	const MAPBOX_PUBLIC_ACCESS_TOKEN =
		'pk.eyJ1IjoidGVybW94aW4iLCJhIjoiY2w0NjdhOHgxMDVtcTNjbjIwdWxjZHVsdCJ9.-RRQ9TZ9JdX8wkZfsOKq5g'

	const fetchPlaces = async (query: string) => {
		if (!query) {
			setPlaces([])
			return
		}

		setIsLoading(true)
		try {
			const response = await axios.get(
				`${MAPBOX_GEOCODING_API_URL}/${query}.json`,
				{
					params: {
						access_token: MAPBOX_PUBLIC_ACCESS_TOKEN,
					},
				}
			)
			setPlaces(response.data.features)
		} catch (error) {
			console.error('Error fetching places:', error)
			setPlaces([])
		} finally {
			setIsLoading(false)
		}
	}

	useEffect(() => {
		if (debouncedQuery && allowFetch) {
			fetchPlaces(debouncedQuery)
			setShowList(true)
		} else {
			setPlaces([])
			setShowList(false)
		}
		setActiveIndex(-1)
	}, [debouncedQuery, allowFetch])

	useOnClickOutside(containerRef, () => {
		setShowList(false)
	})

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setQuery(e.target.value)
		setAllowFetch(true) // Разрешить запросы при вводе
	}

	const handlePlaceClick = (place: Place) => {
		setSelectedPlace(place)
		setQuery(place.place_name)
		setAllowFetch(false) // Отключить запросы после выбора
		setShowList(false)
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'ArrowDown') {
			setActiveIndex((prevIndex) => (prevIndex + 1) % places.length)
		} else if (e.key === 'ArrowUp') {
			setActiveIndex((prevIndex) =>
				prevIndex === 0 ? places.length - 1 : prevIndex - 1
			)
		} else if (e.key === 'Enter' && activeIndex >= 0) {
			handlePlaceClick(places[activeIndex])
		}
	}

	const renderPropertyValue = (value: string | boolean | undefined) => {
		if (typeof value === 'boolean') {
			return value ? '✅' : '❌'
		}
		return value || 'N/A'
	}

	useEffect(() => {
		if (listRef.current && activeIndex >= 0) {
			const activeItem = listRef.current.children[activeIndex]
			activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
		}
	}, [activeIndex])

	return (
		<div className='autocomplete' ref={containerRef}>
			<input
				type='text'
				value={query}
				onChange={handleInputChange}
				onKeyDown={handleKeyDown}
				placeholder='Type a place name...'
			/>
			{isLoading && <Loader />}
			{showList && (
				<ul ref={listRef} className='autocomplete-list'>
					{places.length === 0 ? (
						<li className='no-results'>Not found</li>
					) : (
						places.map((place, index) => (
							<li
								key={place.id}
								className={index === activeIndex ? 'active' : ''}
								onClick={() => handlePlaceClick(place)}
							>
								{Object.entries(place.properties)
									.filter(([key]) => ['category'].includes(key))
									.map(([key, value]) => (
										<b key={key} className='category-name'>
											📌{value}
										</b>
									))}
								<p className='place-name'>{place.place_name}</p>
							</li>
						))
					)}
				</ul>
			)}
			{selectedPlace && (
				<div className='selected-place'>
					<h3>🌍 {selectedPlace.place_name}</h3>
					{Object.entries(selectedPlace.properties).map(([key, value]) => (
						<p key={key}>
							<strong>{key}:</strong> {renderPropertyValue(value)}
						</p>
					))}
				</div>
			)}
		</div>
	)
}

export default Autocomplete
