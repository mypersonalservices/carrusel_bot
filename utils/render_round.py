#!/usr/bin/env python
from pathlib import Path
import shutil

from jinja2 import Template

from mockdata import fake


current_path = Path(__file__).parent.absolute()


def get_mock_round_data(matches=5):
    current_team_id = 100
    current_player_id = 100
    matches_data = {}
    for round_match in range(matches):
        round_match_id = round_match + 1
        current_match = "partido" + str(round_match)
        home_team_id = current_team_id
        home_team_name = fake.team_name()
        current_team_id +=1
        away_team_id = current_team_id
        away_team_name = fake.team_name()
        current_team_id +=1
        
        # Home Team 25 Players
        home_team_players = []
        for i in range(25):
            current_player = {
                'id': current_player_id,
                'nombre': "L-P" + str(round_match_id) + fake.name() + " " + fake.name(),
                'foto': 'https://cdn.jsdelivr.net/gh/cadenaservices/carrusel_data_bot@master/players/' + str(current_player_id) + "_small.png",
                'posicion': fake.player_type()
            }
            home_team_players.append(current_player)
            current_player_id += 1

        # Away Team 25 Players
        away_team_players = []
        for i in range(25):
            current_player = {
                'id': current_player_id,
                'nombre': "V-P" + str(round_match_id) + fake.name() + " " + fake.name(),
                'foto': 'https://cdn.jsdelivr.net/gh/cadenaservices/carrusel_data_bot@master/players/' + str(current_player_id) + "_small.png",
                'posicion': fake.player_type()
            }
            away_team_players.append(current_player)
            current_player_id += 1

        current_match_data = {
            'local': {
                'id': home_team_id,
                'nombre': home_team_name,
                'escudo': 'https://cdn.jsdelivr.net/gh/cadenaservices/carrusel_data_bot@master/teams/' + str(home_team_id) + '_small.png',
                'jugadores': home_team_players,
            },
            'visitante': {
                'id': away_team_id,
                'nombre': away_team_name,
                'escudo': 'https://cdn.jsdelivr.net/gh/cadenaservices/carrusel_data_bot@master/teams/' + str(away_team_id) + '_small.png',
                'jugadores': away_team_players,
            }
        }

        matches_data.update({'partido'+str(round_match_id): current_match_data})
    return matches_data


def render_webapp_round():
    # Load webapp template
    with open(current_path / "webapp_template.html", "r+") as f:
        webapp_template = Template(f.read())
    
    # Render template with given data
    data_to_render = get_mock_round_data()
    rendered_template = webapp_template.render(round_data=data_to_render)
    
    # Build rendered webapp
    output_dir = current_path / "build"
    # # Remove previous builds and use a clean build dir
    shutil.rmtree(output_dir, ignore_errors=True)
    output_dir.mkdir(exist_ok=True,  parents=True)
    # # Save rendered template
    output_path = output_dir / "index.html"
    with open(output_path, "w+") as f:
        f.write(rendered_template)
    # # Copy necessary assets to build folder
    source_assets_dir = current_path / "assets"
    destination_assets_dir = output_dir / "assets"
    shutil.copytree(source_assets_dir, destination_assets_dir, dirs_exist_ok=True)



if __name__ == "__main__":
    render_webapp_round()
