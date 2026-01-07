
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.join(__dirname, 'frontend/src/pages/pulchowk.json');

try {
    const data = fs.readFileSync(jsonPath, 'utf8');
    const geojson = JSON.parse(data);

    if (geojson.features) {
        geojson.features.forEach(feature => {
            if (feature.properties && feature.properties.description) {
                // Initialize new fields if they don't exist
                if (!feature.properties.title) {
                    feature.properties.title = feature.properties.description;
                }
                if (!feature.properties.about) {
                    feature.properties.about = `This is the location for ${feature.properties.description}.`;
                }
                if (!feature.properties.image) {
                    feature.properties.image = ""; // Default empty, can typically use a placeholder if needed
                }
            }
        });
    }

    fs.writeFileSync(jsonPath, JSON.stringify(geojson, null, 4), 'utf8');
    console.log('Successfully updated pulchowk.json with title, about, and image fields.');

} catch (err) {
    console.error('Error updating JSON file:', err);
}
