function benchmarkSelectors(cssString) {
	function extractSelectors(cssString) {
		cssString = cssString.replace(/\/\*[\s\S]*?\*\//g, '') // remove comments

		// remove nested brackets
		let result = ''
		let depth = 0
		for (let char of cssString) {
			if (char === '{') {
				depth++
			} else if (char === '}') {
				depth--
			} else if (depth === 0) {
				result += char
			}
		}
		cssString = result

		let selectors = cssString
			.split(/,(?![^(]*\))|[\n\r]+/) // split by commas or newline
			.map((s) => s.trim().replace(/::(?:before|after)/, '')) // trim pseudo-elements
			.filter(Boolean) // remove empty strings

		return selectors
	}

	const benchmarkSelector = (selector) => {
		const start = performance.now()
		let matches = 0
		for (let i = 0; i < 1000; i++) {
			matches = document.querySelectorAll(selector).length
		}
		return [(performance.now() - start) / 1000, matches]
	}

	return extractSelectors(cssString)
		.map((selector) => {
			try {
				const [time, matches] = benchmarkSelector(selector)
				return { selector, time, matches }
			} catch (error) {
				console.error(
					`Error benchmarking "${selector}": ${error.message}`
				)
				return null
			}
		})
		.filter(Boolean)
		.sort((a, b) => b.time - a.time)
		.map(
			({ selector, time, matches }) =>
				`"${selector}",${time.toFixed(6)},${matches}`
		)
		.join('\n')
		.replace(/^/, 'Selector,Time (ms),Matches\n')
}
