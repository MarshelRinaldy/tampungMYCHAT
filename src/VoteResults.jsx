import React from 'react';

const VoteResults = ({ options }) => {
    const totalVotes = Object.values(options).reduce(
        (sum, option) => sum + option.voters.length,
        0
    );
    return (
        <div className="vote-results">
            <h3>Hasil Vote:</h3>
            <ul>
                {Object.values(options).map((option, index) => (
                <li key={index}>
                    <p>{`${index + 1}. ${option.text} ( ${((option.voters.length / totalVotes) * 100)}% )`}</p>
                    {option.voters.length > 0 && (
                    <div className="voters-list">
                        {option.voters.map((voter, voterIndex) => (
                        <React.Fragment key={voterIndex}>
                            <span className="voter-name">{'- '}{voter}</span>
                            {voterIndex < option.voters.length - 1 && <br />}
                        </React.Fragment>
                        ))}
                    </div>
                    )}
                </li>
                ))}
            </ul>
        </div>
    );
};

export default VoteResults;