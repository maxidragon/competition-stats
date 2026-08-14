import { Table, TableHead, TableRow, TableCell, TableBody, Link } from "@mui/material";
import Flag from "react-world-flags";
import { SORWithPosition } from "../../../logic/interfaces"
import { WCA_ORIGIN } from "../../../logic/request";

interface SORTableProps {
    data: SORWithPosition[];
}

const SORTable = ({ data }: SORTableProps) => {
    return (
        <Table>
            <TableHead>
                <TableRow>
                    <TableCell>Position</TableCell>
                    <TableCell>Country</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Sum of ranks</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {data.map((item: SORWithPosition) => (
                    <TableRow key={item.person.registrantId}>
                        <TableCell>{item.position}</TableCell>
                        <TableCell sx={{ display: "flex", alignItems: "center" }}>
                            <Flag code={item.person.countryIso2.toLowerCase()} width="32" />
                        </TableCell>
                        <TableCell>
                            {item.person.wcaId ? (
                                <Link
                                    href={`${WCA_ORIGIN}/persons/${item.person.wcaId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {item.person.name}
                                </Link>
                            ) : (
                                item.person.name
                            )}
                        </TableCell>
                        <TableCell>{item.value}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );

};

export default SORTable;