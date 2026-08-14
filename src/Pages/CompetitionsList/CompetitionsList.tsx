import {
  Box,
  Typography,
  TextField,
  Paper,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  LinearProgress,
} from "@mui/material";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CompetitionInfo } from "../../logic/interfaces";
import CompetitionFlagIcon from "../../Components/CompetitionFlagIcon";
import { searchCompetitions } from "../../logic/competitions";

const SEARCH_DEBOUNCE_MS = 300;

const CompetitionsList = () => {
  const navigate = useNavigate();
  const [competitions, setCompetitions] = useState<CompetitionInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>("");

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(event.target.value);
  };

  useEffect(() => {
    // Debounced so we do not fire a request per keystroke, and guarded so a slow
    // response for an earlier query cannot overwrite a newer one.
    let stale = false;
    setIsLoading(true);
    const timeout = setTimeout(() => {
      searchCompetitions(searchText).then((data) => {
        if (stale) return;
        setCompetitions(data);
        setIsLoading(false);
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      stale = true;
      clearTimeout(timeout);
    };
  }, [searchText, navigate]);
  return (
    <>
      <Box
        sx={{
          py: { xs: 2, md: 3 },
          px: { xs: 1, md: 3 },
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 2,
        }}
      >
        <Typography variant="h5" sx={{ marginBottom: "0.2em" }}>
          Search for competition
        </Typography>
        <TextField
          id="outlined-basic"
          label="Search"
          variant="outlined"
          onChange={handleSearch}
          value={searchText}
        />
        <Paper>
          {isLoading && <LinearProgress />}
          {competitions.length > 0 ? (
            <List dense={true} disablePadding>
              {competitions.map((competition) => (
                <ListItemButton
                  key={competition.id}
                  component={Link}
                  to={`/competitions/${competition.id}`
                  }
                >
                  <ListItemIcon>
                    <ListItemIcon sx={{ p: 2 }}>
                      <CompetitionFlagIcon
                        country={competition.country_iso2}
                      />
                    </ListItemIcon>
                  </ListItemIcon>
                  <ListItemText primary={competition.name} />
                </ListItemButton>
              ))}
            </List>
          ) : !isLoading && (
            <Typography variant="body1" sx={{ p: 2 }}>
              No competitions found
            </Typography>
          )}
        </Paper>
      </Box>
    </>
  );
};

export default CompetitionsList;