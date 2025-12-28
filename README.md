# Elite Radar React

A React-based 3D radar visualization component inspired by the iconic radar system from Elite Dangerous. This project provides an interactive, space-themed radar display for tracking objects in 3D space.

![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)
![JavaScript](https://img.shields.io/badge/javascript-65.8%25-yellow)
![HTML](https://img.shields.io/badge/html-34.2%25-orange)

## Overview

Elite Radar React implements a sophisticated 3D radar display system that visualizes objects in three-dimensional space. The radar provides both horizontal and vertical positioning information, making it ideal for space-themed applications, flight simulators, or any project requiring spatial awareness visualization.

## Features

- **3D Spatial Visualization**: Track objects with full 3D positioning (horizontal and vertical)
- **React-Based Architecture**: Built with modern React for seamless integration
- **Interactive Display**: Real-time updates and smooth animations
- **Customizable Styling**: Flexible theming options to match your application
- **Demo Implementation**: Includes working examples to get started quickly

## Project Structure

```
Elite-Radar-React/
├── EliteRadar3D.jsx          # Main React component
├── EliteRadar3D.html         # Standalone HTML implementation
├── EliteRadarDemo.jsx        # Demo/example usage
├── Elite-Style-radar-JSX.md  # Styling documentation
└── LICENSE                   # Apache 2.0 License
```

## Installation

### Using as a Component

1. Clone the repository:
```bash
git clone https://github.com/MushroomFleet/Elite-Radar-React.git
cd Elite-Radar-React
```

2. Copy the component files to your React project:
```bash
cp EliteRadar3D.jsx your-project/src/components/
```

### Standalone HTML Version

For a quick start without React setup, use the standalone HTML file:

```bash
# Simply open EliteRadar3D.html in your browser
open EliteRadar3D.html
```

## Usage

### Basic React Implementation

```jsx
import EliteRadar3D from './components/EliteRadar3D';

function App() {
  const radarData = [
    { id: 1, x: 100, y: 50, z: 25, type: 'ally' },
    { id: 2, x: -80, y: 120, z: -10, type: 'enemy' },
    // Add more objects...
  ];

  return (
    <div className="App">
      <EliteRadar3D 
        objects={radarData}
        range={200}
        width={400}
        height={400}
      />
    </div>
  );
}
```

### Demo Example

Check out `EliteRadarDemo.jsx` for a complete working example with multiple tracked objects and interactive features.

## Configuration Options

The radar component accepts the following props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `objects` | Array | `[]` | Array of objects to display on radar |
| `range` | Number | `100` | Maximum detection range |
| `width` | Number | `400` | Radar display width in pixels |
| `height` | Number | `400` | Radar display height in pixels |
| `showGrid` | Boolean | `true` | Display grid overlay |
| `theme` | String | `'dark'` | Color theme ('dark' or 'light') |

## Styling

For detailed styling guidelines and customization options, refer to `Elite-Style-radar-JSX.md`.

The radar supports custom CSS variables for easy theming:

```css
.elite-radar {
  --radar-bg: #001122;
  --radar-grid: #00ff88;
  --radar-ally: #00ff00;
  --radar-enemy: #ff0000;
  --radar-neutral: #ffff00;
}
```

## Browser Compatibility

- Chrome/Edge: 90+
- Firefox: 88+
- Safari: 14+
- Opera: 76+

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Roadmap

- [ ] Add WebGL rendering for improved performance
- [ ] Implement object filtering and grouping
- [ ] Add sound effects for contacts
- [ ] Create TypeScript definitions
- [ ] Add more customization options
- [ ] Improve mobile responsiveness

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## Credits

**ORAGEN TEAM**

Inspired by the radar system from Elite Dangerous by Frontier Developments.

## 📚 Citation

### Academic Citation

If you use this codebase in your research or project, please cite:

```bibtex
@software{elite_radar_react,
  title = {Elite Radar React: Inspired by the radar system from Elite},
  author = {[Drift Johnson]},
  year = {2025},
  url = {https://github.com/MushroomFleet/Elite-Radar-React},
  version = {1.0.0}
}
```

### Donate:


[![Ko-Fi](https://cdn.ko-fi.com/cdn/kofi3.png?v=3)](https://ko-fi.com/driftjohnson)

## Acknowledgments

- Elite Dangerous for the original radar concept
- React community for excellent documentation
- All contributors who have helped improve this project

## Support

If you encounter any issues or have questions:

- Open an [Issue](https://github.com/MushroomFleet/Elite-Radar-React/issues)
- Check existing issues for solutions
- Review the demo implementation for usage examples

## Links

- [Repository](https://github.com/MushroomFleet/Elite-Radar-React)
- [Issues](https://github.com/MushroomFleet/Elite-Radar-React/issues)
- [Pull Requests](https://github.com/MushroomFleet/Elite-Radar-React/pulls)

---

**Note**: This is an unofficial fan project and is not affiliated with or endorsed by Frontier Developments plc.
